import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReferralStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { PlatformSettingsService } from '../settings/platform-settings.service';

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private walletService: WalletService,
    private platformSettings: PlatformSettingsService,
  ) {}

  async ensureReferralCode(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.referralCode) return user.referralCode;

    const code = `LIF${userId.slice(0, 6).toUpperCase()}`;
    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });
    return code;
  }

  async getReferralInfo(userId: string) {
    const code = await this.ensureReferralCode(userId);
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      include: { referee: { select: { name: true, phone: true } } },
    });
    const totalEarned = referrals
      .filter((r) => r.status === ReferralStatus.completed)
      .reduce((sum, r) => sum + r.rewardAmount, 0);

    return {
      code,
      totalReferrals: referrals.length,
      totalEarned,
      referrals,
    };
  }

  async applyReferralCode(refereeId: string, code: string) {
    const referrer = await this.prisma.user.findFirst({
      where: { referralCode: code.toUpperCase() },
    });
    if (!referrer || referrer.id === refereeId) {
      throw new BadRequestException('Invalid referral code');
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: refereeId },
    });
    if (existing?.referredById) return;

    const rewardAmount = (await this.platformSettings.get()).referralRewardAmount;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: refereeId },
        data: { referredById: referrer.id },
      }),
      this.prisma.referral.create({
        data: {
          referrerId: referrer.id,
          refereeId,
          code: code.toUpperCase(),
          rewardAmount,
          status: ReferralStatus.pending,
        },
      }),
    ]);
  }

  async processReferralReward(refereeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: refereeId },
      include: { referralsReceived: true },
    });
    if (!user?.referredById) return;

    const referral = await this.prisma.referral.findFirst({
      where: { refereeId, status: ReferralStatus.pending },
    });
    if (!referral) return;

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: { status: ReferralStatus.completed },
    });

    await this.walletService.credit(
      referral.referrerId,
      referral.rewardAmount,
      'Referral reward',
      referral.id,
    );
  }

  async validateReferralCode(code: string) {
    const referrer = await this.prisma.user.findFirst({
      where: { referralCode: code.toUpperCase() },
      select: { id: true, name: true, referralCode: true },
    });
    if (!referrer) {
      throw new BadRequestException('Invalid referral code');
    }
    return {
      valid: true,
      code: referrer.referralCode,
      referrerName: referrer.name ?? 'Liftoo member',
    };
  }
}
