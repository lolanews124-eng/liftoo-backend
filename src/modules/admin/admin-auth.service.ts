import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, verifyPassword } from '../../common/utils/password.util';
import { AdminLoginDto } from './dto/admin.dto';
import { AdminDevStore } from './admin-dev.store';

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: AdminLoginDto) {
    if (!this.prisma.dbReady) {
      const devUser = AdminDevStore.getInstance().devLogin(
        dto.email.toLowerCase(),
        dto.password,
      );
      if (!devUser) throw new UnauthorizedException('Invalid credentials');
      const tokens = await this.generateTokens(
        devUser.id,
        devUser.phone,
        UserRole.admin,
      );
      return { ...tokens, user: devUser };
    }

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
    if (!this.prisma.dbReady) {
      const dev = AdminDevStore.getInstance().adminUser;
      if (userId !== dev.id) throw new UnauthorizedException();
      return dev;
    }

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
