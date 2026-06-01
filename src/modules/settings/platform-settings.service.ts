import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export type PlatformSettingsData = {
  id: string;
  matchRadiusKm: number;
  signupWalletBonus: number;
  referralRewardAmount: number;
  assistantEarningPercent: number;
  matchBatchSize: number;
  platformFeePercent: number;
  bookingSearchTimeoutMin: number;
  cancellationFreeBeforeMin: number;
  cancellationFeePercent: number;
  minCancellationFee: number;
};

@Injectable()
export class PlatformSettingsService implements OnModuleInit {
  private cache: PlatformSettingsData | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    if (!this.prisma.dbReady) {
      this.cache = this.defaults();
      return;
    }
    await this.ensureDefaults();
  }

  private defaults() {
    return {
      id: 'default',
      matchRadiusKm: Number(this.config.get('MATCH_RADIUS_KM', 15)),
      signupWalletBonus: Number(this.config.get('SIGNUP_WALLET_BONUS', 500)),
      referralRewardAmount: Number(this.config.get('REFERRAL_REWARD_AMOUNT', 100)),
      assistantEarningPercent: Number(this.config.get('ASSISTANT_EARNING_PERCENT', 80)),
      matchBatchSize: Number(this.config.get('MATCH_BATCH_SIZE', 3)),
      platformFeePercent: Number(this.config.get('PLATFORM_FEE_PERCENT', 10)),
      bookingSearchTimeoutMin: Number(this.config.get('BOOKING_SEARCH_TIMEOUT_MIN', 15)),
      cancellationFreeBeforeMin: Number(this.config.get('CANCELLATION_FREE_BEFORE_MIN', 60)),
      cancellationFeePercent: Number(this.config.get('CANCELLATION_FEE_PERCENT', 10)),
      minCancellationFee: Number(this.config.get('MIN_CANCELLATION_FEE', 50)),
    };
  }

  async ensureDefaults() {
    if (!this.prisma.dbReady) {
      this.cache = this.defaults();
      return;
    }
    const d = this.defaults();
    await this.prisma.platformSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        matchRadiusKm: d.matchRadiusKm,
        signupWalletBonus: d.signupWalletBonus,
        referralRewardAmount: d.referralRewardAmount,
        assistantEarningPercent: d.assistantEarningPercent,
        matchBatchSize: d.matchBatchSize,
        platformFeePercent: d.platformFeePercent,
        bookingSearchTimeoutMin: d.bookingSearchTimeoutMin,
        cancellationFreeBeforeMin: d.cancellationFreeBeforeMin,
        cancellationFeePercent: d.cancellationFeePercent,
        minCancellationFee: d.minCancellationFee,
        assistantCodeYear: new Date().getFullYear(),
        assistantCodeSeq: 0,
      },
      update: {},
    });
    await this.refreshCache();
  }

  async refreshCache() {
    if (!this.prisma.dbReady) {
      this.cache = this.defaults();
      return this.cache;
    }
    const row = await this.prisma.platformSettings.findUnique({ where: { id: 'default' } });
    if (!row) {
      await this.ensureDefaults();
      return this.get();
    }
    this.cache = {
      id: row.id,
      matchRadiusKm: row.matchRadiusKm,
      signupWalletBonus: row.signupWalletBonus,
      referralRewardAmount: row.referralRewardAmount,
      assistantEarningPercent: row.assistantEarningPercent,
      matchBatchSize: row.matchBatchSize,
      platformFeePercent: row.platformFeePercent,
      bookingSearchTimeoutMin: row.bookingSearchTimeoutMin,
      cancellationFreeBeforeMin: row.cancellationFreeBeforeMin,
      cancellationFeePercent: row.cancellationFeePercent,
      minCancellationFee: row.minCancellationFee,
    };
    return this.cache;
  }

  async get(): Promise<PlatformSettingsData> {
    if (this.cache) return this.cache;
    return this.refreshCache();
  }

  async update(data: Partial<Omit<PlatformSettingsData, 'id'>>) {
    if (!this.prisma.dbReady) {
      this.cache = { ...this.defaults(), ...this.cache, ...data };
      return this.cache;
    }
    const updated = await this.prisma.platformSettings.update({
      where: { id: 'default' },
      data,
    });
    this.cache = {
      id: updated.id,
      matchRadiusKm: updated.matchRadiusKm,
      signupWalletBonus: updated.signupWalletBonus,
      referralRewardAmount: updated.referralRewardAmount,
      assistantEarningPercent: updated.assistantEarningPercent,
      matchBatchSize: updated.matchBatchSize,
      platformFeePercent: updated.platformFeePercent,
      bookingSearchTimeoutMin: updated.bookingSearchTimeoutMin,
      cancellationFreeBeforeMin: updated.cancellationFreeBeforeMin,
      cancellationFeePercent: updated.cancellationFeePercent,
      minCancellationFee: updated.minCancellationFee,
    };
    return this.cache;
  }

  async generateAssistantCode(): Promise<string> {
    if (!this.prisma.dbReady) {
      const year = new Date().getFullYear();
      return `Liftoo-${year}-0001`;
    }
    const year = new Date().getFullYear();
    const row = await this.prisma.platformSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        assistantCodeYear: year,
        assistantCodeSeq: 1,
      },
      update: {},
    });

    let seq = row.assistantCodeSeq;
    let codeYear = row.assistantCodeYear;
    if (codeYear !== year) {
      codeYear = year;
      seq = 0;
    }
    seq += 1;

    await this.prisma.platformSettings.update({
      where: { id: 'default' },
      data: { assistantCodeYear: codeYear, assistantCodeSeq: seq },
    });

    return `Liftoo-${codeYear}-${String(seq).padStart(4, '0')}`;
  }
}
