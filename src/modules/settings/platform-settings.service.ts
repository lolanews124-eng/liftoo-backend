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
  minAssistantSettlementBalance: number;
};

export type AdminPlatformSettingsData = {
  id: string;
  configured: boolean;
  matchRadiusKm: number | null;
  signupWalletBonus: number | null;
  referralRewardAmount: number | null;
  assistantEarningPercent: number | null;
  matchBatchSize: number | null;
  platformFeePercent: number | null;
  bookingSearchTimeoutMin: number | null;
  cancellationFreeBeforeMin: number | null;
  cancellationFeePercent: number | null;
  minCancellationFee: number | null;
  minAssistantSettlementBalance: number | null;
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

  /** Runtime fallbacks (env) until admin saves settings in the panel. */
  private defaults(): PlatformSettingsData {
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
      minAssistantSettlementBalance: Number(
        this.config.get('MIN_ASSISTANT_SETTLEMENT_BALANCE', 150),
      ),
    };
  }

  private emptyAdminPayload(id: string): AdminPlatformSettingsData {
    return {
      id,
      configured: false,
      matchRadiusKm: null,
      signupWalletBonus: null,
      referralRewardAmount: null,
      assistantEarningPercent: null,
      matchBatchSize: null,
      platformFeePercent: null,
      bookingSearchTimeoutMin: null,
      cancellationFreeBeforeMin: null,
      cancellationFeePercent: null,
      minCancellationFee: null,
      minAssistantSettlementBalance: null,
    };
  }

  private rowToRuntime(row: {
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
    minAssistantSettlementBalance: number;
  }): PlatformSettingsData {
    return {
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
      minAssistantSettlementBalance: row.minAssistantSettlementBalance,
    };
  }

  private rowToAdmin(row: {
    id: string;
    settingsConfigured: boolean;
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
    minAssistantSettlementBalance: number;
  }): AdminPlatformSettingsData {
    if (!row.settingsConfigured) {
      return this.emptyAdminPayload(row.id);
    }
    return {
      id: row.id,
      configured: true,
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
      minAssistantSettlementBalance: row.minAssistantSettlementBalance,
    };
  }

  async ensureDefaults() {
    if (!this.prisma.dbReady) {
      this.cache = this.defaults();
      return;
    }
    const year = new Date().getFullYear();
    await this.prisma.platformSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        matchRadiusKm: 0,
        signupWalletBonus: 0,
        referralRewardAmount: 0,
        assistantEarningPercent: 0,
        matchBatchSize: 0,
        platformFeePercent: 0,
        bookingSearchTimeoutMin: 0,
        cancellationFreeBeforeMin: 0,
        cancellationFeePercent: 0,
        minCancellationFee: 0,
        minAssistantSettlementBalance: 0,
        settingsConfigured: false,
        assistantCodeYear: year,
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
    if (!row.settingsConfigured) {
      this.cache = this.defaults();
      return this.cache;
    }
    this.cache = this.rowToRuntime(row);
    return this.cache;
  }

  /** Used by app/API — env defaults apply until admin has saved settings. */
  async get(): Promise<PlatformSettingsData> {
    if (this.cache) return this.cache;
    return this.refreshCache();
  }

  /** Used by admin panel — empty fields until first save. */
  async getForAdmin(): Promise<AdminPlatformSettingsData> {
    if (!this.prisma.dbReady) {
      return this.emptyAdminPayload('default');
    }
    let row = await this.prisma.platformSettings.findUnique({ where: { id: 'default' } });
    if (!row) {
      await this.ensureDefaults();
      row = await this.prisma.platformSettings.findUnique({ where: { id: 'default' } });
    }
    if (!row) return this.emptyAdminPayload('default');
    return this.rowToAdmin(row);
  }

  async update(data: Partial<Omit<PlatformSettingsData, 'id'>>) {
    if (!this.prisma.dbReady) {
      this.cache = { ...this.defaults(), ...this.cache, ...data };
      const cached = this.cache!;
      return this.rowToAdmin({
        ...cached,
        settingsConfigured: true,
      });
    }
    const updated = await this.prisma.platformSettings.update({
      where: { id: 'default' },
      data: { ...data, settingsConfigured: true },
    });
    this.cache = this.rowToRuntime(updated);
    return this.rowToAdmin(updated);
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
        settingsConfigured: false,
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
