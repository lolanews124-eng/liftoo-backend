import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, verifyPassword } from '../../common/utils/password.util';
import { AdminLoginDto } from './dto/admin.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private assertDbReady() {
    if (!this.prisma.dbReady) {
      throw new ServiceUnavailableException('Database is unavailable. Try again shortly.');
    }
  }

  async login(dto: AdminLoginDto) {
    this.assertDbReady();

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (
      !user ||
      !user.passwordHash ||
      !user.roles.includes(UserRole.admin) ||
      user.isSuspended
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.phone ?? '', UserRole.admin);
    return {
      ...tokens,
      user: this.toAdminUser(user),
    };
  }

  async me(userId: string) {
    this.assertDbReady();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.roles.includes(UserRole.admin)) {
      throw new UnauthorizedException();
    }
    return this.toAdminUser(user);
  }

  static hashPassword(password: string) {
    return hashPassword(password);
  }

  private toAdminUser(user: {
    id: string;
    email: string | null;
    phone: string | null;
    name: string | null;
    roles: UserRole[];
    activeRole: UserRole | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      roles: user.roles,
      activeRole: user.activeRole,
    };
  }

  private async generateTokens(userId: string, phone: string, activeRole: UserRole) {
    const payload = { sub: userId, phone, activeRole };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
    return { accessToken, refreshToken };
  }
}
