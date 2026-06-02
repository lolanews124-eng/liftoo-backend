import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpStoreService } from '../../otp/otp-store.service';
import { UsersService } from '../users/users.service';
import { ReferralsService } from '../referrals/referrals.service';
import { PlatformSettingsService } from '../settings/platform-settings.service';
import { hashPassword, verifyPassword } from '../../common/utils/password.util';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private otpStore: OtpStoreService,
    private jwt: JwtService,
    private config: ConfigService,
    private usersService: UsersService,
    private referralsService: ReferralsService,
    private platformSettings: PlatformSettingsService,
    private emailService: EmailService,
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private isDevOtpMode() {
    const v = this.config.get('OTP_DEV_MODE');
    return v === 'true' || v === true;
  }

  private generateOtp() {
    return this.isDevOtpMode()
      ? '123456'
      : String(Math.floor(100000 + Math.random() * 900000));
  }

  private otpKey(email: string) {
    return `otp:email:${email}`;
  }

  private async sendEmailOtp(email: string) {
    const rateKey = `otp:rate:${email}`;
    const attempts = this.otpStore.incr(rateKey, 60);
    if (attempts > 5) {
      throw new BadRequestException('Too many OTP requests. Try again later.');
    }

    const otp = this.generateOtp();
    this.otpStore.set(this.otpKey(email), otp, 300);
    await this.emailService.sendOtpEmail(email, otp);

    const response: Record<string, unknown> = {
      message: 'Verification code sent to your email',
      expiresIn: 300,
    };
    if (this.isDevOtpMode()) {
      response.devOtp = otp;
    }
    return response;
  }

  /** Email + password → sends OTP to email (registers new users). */
  async loginWithEmail(email: string, password: string) {
    const normalized = this.normalizeEmail(email);
    let user = await this.prisma.user.findUnique({ where: { email: normalized } });
    const isNewUser = !user;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: normalized,
          passwordHash: hashPassword(password),
          roles: [],
          emailVerified: false,
        },
      });
    } else {
      if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        throw new UnauthorizedException('Invalid email or password');
      }
    }

    if (user.emailVerified) {
      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.phone,
        user.activeRole,
      );
      return {
        ...tokens,
        user: await this.usersService.getProfile(user.id),
        requiresOtp: false,
        isNewUser: false,
      };
    }

    const otpResponse = await this.sendEmailOtp(normalized);
    return { ...otpResponse, requiresOtp: true, isNewUser };
  }

  async verifyEmailOtp(email: string, otp: string, referralCode?: string) {
    const normalized = this.normalizeEmail(email);
    const stored = this.otpStore.get(this.otpKey(normalized));
    if (!stored || stored !== otp) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }
    this.otpStore.del(this.otpKey(normalized));

    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      throw new UnauthorizedException('Account not found');
    }

    const existingWallet = await this.prisma.wallet.findUnique({ where: { userId: user.id } });
    const isNewUser = !existingWallet;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    if (isNewUser) {
      const settings = await this.platformSettings.get();
      await this.prisma.wallet.create({
        data: { userId: user.id, balance: settings.signupWalletBonus },
      });
      if (referralCode) {
        await this.referralsService.applyReferralCode(user.id, referralCode);
      }
    }

    if (!user.referralCode) {
      await this.referralsService.ensureReferralCode(user.id);
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.phone,
      user.activeRole,
    );
    return {
      ...tokens,
      user: await this.usersService.getProfile(user.id),
      isNewUser,
    };
  }

  async setRole(userId: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (role === UserRole.customer) {
      const availability = await this.prisma.assistantAvailability.findUnique({
        where: { userId },
      });
      if (availability?.isOnline) {
        throw new BadRequestException(
          'Go offline before switching to customer mode.',
        );
      }
      const activeJob = await this.prisma.booking.findFirst({
        where: {
          assistantId: userId,
          status: {
            in: [
              BookingStatus.assigned,
              BookingStatus.arriving,
              BookingStatus.started,
            ],
          },
        },
      });
      if (activeJob) {
        throw new BadRequestException(
          'Complete your active job before switching to customer mode.',
        );
      }
    }

    if (role === UserRole.assistant) {
      const activeBooking = await this.prisma.booking.findFirst({
        where: {
          customerId: userId,
          status: {
            notIn: [BookingStatus.completed, BookingStatus.cancelled],
          },
        },
      });
      if (activeBooking) {
        throw new BadRequestException(
          'Complete or cancel your active booking before switching to assistant mode.',
        );
      }
    }

    const roles = new Set(user.roles);
    roles.add(role);

    if (role === UserRole.customer) {
      await this.prisma.customerProfile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    }
    if (role === UserRole.assistant) {
      const existing = await this.prisma.assistantProfile.findUnique({ where: { userId } });
      let assistantCode = existing?.assistantCode;
      if (!assistantCode) {
        assistantCode = await this.platformSettings.generateAssistantCode();
      }
      await this.prisma.assistantProfile.upsert({
        where: { userId },
        create: { userId, assistantCode, adminVerified: false },
        update: existing?.assistantCode ? {} : { assistantCode },
      });
      await this.prisma.assistantAvailability.upsert({
        where: { userId },
        create: { userId, isOnline: false },
        update: {},
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { roles: Array.from(roles), activeRole: role },
    });

    const tokens = await this.generateTokens(
      updated.id,
      updated.email,
      updated.phone,
      updated.activeRole,
    );
    return {
      ...tokens,
      user: await this.usersService.getProfile(userId),
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) throw new UnauthorizedException();
      return this.generateTokens(user.id, user.email, user.phone, user.activeRole);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(
    userId: string,
    email: string | null,
    phone: string | null,
    activeRole?: UserRole | null,
  ) {
    const payload = {
      sub: userId,
      email: email ?? undefined,
      phone: phone ?? undefined,
      activeRole: activeRole ?? undefined,
    };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
    return { accessToken, refreshToken };
  }
}
