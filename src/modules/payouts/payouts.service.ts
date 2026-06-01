import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PayoutRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PayoutsService {
  constructor(private prisma: PrismaService) {}

  async requestPayout(
    assistantId: string,
    data: { amount: number; bankAccount?: string; ifscCode?: string },
  ) {
    if (data.amount <= 0) throw new BadRequestException('Invalid amount');

    const profile = await this.prisma.assistantProfile.findUnique({
      where: { userId: assistantId },
    });
    if (!profile?.bankVerified) {
      throw new BadRequestException('Complete bank verification first');
    }

    const unpaid = await this.prisma.earning.aggregate({
      where: { assistantId, isPaidOut: false },
      _sum: { amount: true },
    });
    const available = unpaid._sum.amount ?? 0;
    if (data.amount > available) {
      throw new BadRequestException(`Maximum available: ₹${available}`);
    }

    const pending = await this.prisma.payoutRequest.count({
      where: { assistantId, status: PayoutRequestStatus.pending },
    });
    if (pending > 0) {
      throw new BadRequestException('You already have a pending payout request');
    }

    return this.prisma.payoutRequest.create({
      data: {
        assistantId,
        amount: data.amount,
        bankAccount: data.bankAccount ?? profile.bankAccount,
        ifscCode: data.ifscCode ?? profile.ifscCode,
      },
    });
  }

  async listForAssistant(assistantId: string) {
    return this.prisma.payoutRequest.findMany({
      where: { assistantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAll(status?: PayoutRequestStatus) {
    return this.prisma.payoutRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        assistant: {
          select: { id: true, name: true, phone: true, assistantProfile: true },
        },
      },
    });
  }

  async process(
    id: string,
    status: PayoutRequestStatus,
    adminNote?: string,
  ) {
    const req = await this.prisma.payoutRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Payout request not found');
    if (req.status !== PayoutRequestStatus.pending && req.status !== PayoutRequestStatus.approved) {
      throw new BadRequestException('Cannot update this request');
    }

    if (status === PayoutRequestStatus.paid) {
      return this.prisma.$transaction(async (tx) => {
        const earnings = await tx.earning.findMany({
          where: { assistantId: req.assistantId, isPaidOut: false },
          orderBy: { createdAt: 'asc' },
        });
        let remaining = req.amount;
        for (const e of earnings) {
          if (remaining <= 0) break;
          await tx.earning.update({ where: { id: e.id }, data: { isPaidOut: true } });
          remaining -= e.amount;
        }
        return tx.payoutRequest.update({
          where: { id },
          data: { status, adminNote, processedAt: new Date() },
        });
      });
    }

    return this.prisma.payoutRequest.update({
      where: { id },
      data: {
        status,
        adminNote,
        processedAt: status === PayoutRequestStatus.rejected ? new Date() : undefined,
      },
    });
  }

  async getAvailableBalance(assistantId: string) {
    const unpaid = await this.prisma.earning.aggregate({
      where: { assistantId, isPaidOut: false },
      _sum: { amount: true },
    });
    return { available: unpaid._sum.amount ?? 0 };
  }
}
