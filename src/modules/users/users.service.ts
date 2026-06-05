import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'searching',
  'assigned',
  'arriving',
  'started',
];

const INDIAN_PHONE = /^[6-9]\d{9}$/;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private isProfileComplete(user: {
    name: string | null;
    emailVerified: boolean;
    phone: string | null;
  }) {
    return !!(
      user.name?.trim() &&
      user.emailVerified &&
      user.phone &&
      INDIAN_PHONE.test(user.phone)
    );
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
        assistantProfile: true,
        wallet: true,
        availability: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      phone: user.phone,
      name: user.name,
      avatarUrl: user.avatarUrl,
      roles: user.roles,
      activeRole: user.activeRole,
      referralCode: user.referralCode,
      walletBalance: user.wallet?.balance ?? 0,
      profileComplete: this.isProfileComplete(user),
      assistantProfile: user.assistantProfile
        ? {
            rating: user.assistantProfile.rating,
            totalJobs: user.assistantProfile.totalJobs,
            aadhaarVerified: user.assistantProfile.aadhaarVerified,
            selfieVerified: user.assistantProfile.selfieVerified,
            bankVerified: user.assistantProfile.bankVerified,
            profileCompletion: this.calcProfileCompletion(user.assistantProfile),
            assistantCode: user.assistantProfile.assistantCode,
            adminVerified: user.assistantProfile.adminVerified,
          }
        : null,
      isOnline: user.availability?.isOnline ?? false,
    };
  }

  async updateProfile(
    userId: string,
    data: { name?: string; avatarUrl?: string; phone?: string },
  ) {
    if (data.phone !== undefined) {
      const phone = data.phone.trim();
      if (!INDIAN_PHONE.test(phone)) {
        throw new BadRequestException('Invalid Indian mobile number');
      }
      const taken = await this.prisma.user.findFirst({
        where: { phone, NOT: { id: userId } },
      });
      if (taken) {
        throw new ConflictException('This mobile number is already registered');
      }
      data = { ...data, phone };
    }
    await this.prisma.user.update({ where: { id: userId }, data });
    return this.getProfile(userId);
  }

  async updateFcmToken(userId: string, token: string | null) {
    const normalized = token?.trim() || null;
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: normalized },
    });
    return { ok: true };
  }

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAddress(
    userId: string,
    data: {
      label: string;
      formattedAddress: string;
      lat: number;
      lng: number;
      isDefault?: boolean;
    },
  ) {
    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({ data: { ...data, userId } });
  }

  async updateAddress(
    userId: string,
    id: string,
    data: {
      label: string;
      formattedAddress: string;
      lat: number;
      lng: number;
      isDefault?: boolean;
    },
  ) {
    const addr = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!addr) throw new NotFoundException('Address not found');
    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.update({ where: { id }, data });
  }

  async deleteAddress(userId: string, id: string) {
    const addr = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!addr) throw new NotFoundException('Address not found');
    await this.prisma.address.delete({ where: { id } });
    return { deleted: true };
  }

  async setDefaultAddress(userId: string, id: string) {
    const addr = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!addr) throw new NotFoundException('Address not found');
    await this.prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
    return this.prisma.address.update({ where: { id }, data: { isDefault: true } });
  }

  private calcProfileCompletion(profile: {
    aadhaarVerified: boolean;
    selfieVerified: boolean;
    bankVerified: boolean;
  }) {
    let score = 0;
    if (profile.aadhaarVerified) score += 34;
    if (profile.selfieVerified) score += 33;
    if (profile.bankVerified) score += 33;
    return score;
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true, availability: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.roles.includes(UserRole.admin)) {
      throw new ForbiddenException('Admin accounts cannot be deleted from the app');
    }

    const activeBookings = await this.prisma.booking.count({
      where: {
        OR: [
          { customerId: userId, status: { in: ACTIVE_BOOKING_STATUSES } },
          { assistantId: userId, status: { in: ACTIVE_BOOKING_STATUSES } },
        ],
      },
    });
    if (activeBookings > 0) {
      throw new BadRequestException(
        'Complete or cancel your active bookings before deleting your account',
      );
    }

    const pendingPayouts = await this.prisma.payoutRequest.count({
      where: { assistantId: userId, status: 'pending' },
    });
    if (pendingPayouts > 0) {
      throw new BadRequestException(
        'Wait for pending payout requests to be processed before deleting your account',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { userId } });
      await tx.address.deleteMany({ where: { userId } });
      await tx.assistantVerificationDocument.deleteMany({ where: { userId } });
      await tx.supportTicket.deleteMany({ where: { userId } });
      await tx.appReview.deleteMany({ where: { userId } });
      await tx.payoutRequest.deleteMany({ where: { assistantId: userId } });

      if (user.availability) {
        await tx.assistantAvailability.delete({ where: { userId } });
      }

      await tx.user.updateMany({
        where: { referredById: userId },
        data: { referredById: null },
      });

      if (user.wallet && user.wallet.balance > 0) {
        await tx.walletTransaction.create({
          data: {
            walletId: user.wallet.id,
            type: 'debit',
            amount: user.wallet.balance,
            description: 'Account deletion — wallet balance forfeited',
          },
        });
        await tx.wallet.update({
          where: { id: user.wallet.id },
          data: { balance: 0 },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          name: 'Deleted User',
          email: null,
          phone: null,
          passwordHash: null,
          avatarUrl: null,
          fcmToken: null,
          referralCode: null,
          referredById: null,
          roles: [],
          activeRole: null,
          emailVerified: false,
          isSuspended: true,
        },
      });
    });

    return { deleted: true };
  }
}
