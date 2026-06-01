import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
}
