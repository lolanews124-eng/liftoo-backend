import { BadRequestException, Injectable, Inject, forwardRef } from '@nestjs/common';
import { WalletTransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notifications: NotificationsService,
  ) {}

  async getWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId },
        include: { transactions: true },
      });
    }
    return wallet;
  }

  async credit(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
  ) {
    const wallet = await this.ensureWallet(userId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const w = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.credit,
          amount,
          description,
          referenceId,
        },
      });
      return w;
    });

    await this.notifications.create(userId, {
      type: NotificationType.earnings_credited,
      title: 'Wallet credited',
      body: `₹${amount} added to your wallet`,
      payload: { amount },
    });

    return updated;
  }

  async debit(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
  ) {
    const wallet = await this.ensureWallet(userId);
    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }
    return this.prisma.$transaction(async (tx) => {
      const w = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.debit,
          amount,
          description,
          referenceId,
        },
      });
      return w;
    });
  }

  async topUp(userId: string, amount: number) {
    return this.credit(userId, amount, 'Wallet top-up');
  }

  private async ensureWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await this.prisma.wallet.create({ data: { userId } });
    }
    return wallet;
  }
}
