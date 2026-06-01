import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EarningsService {
  constructor(private prisma: PrismaService) {}

  async credit(assistantId: string, amount: number, bookingId: string) {
    return this.prisma.earning.create({
      data: {
        assistantId,
        amount,
        bookingId,
        description: `Earning from booking ${bookingId.slice(0, 8)}`,
      },
    });
  }

  async getSummary(assistantId: string) {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const [today, week, total, history] = await Promise.all([
      this.prisma.earning.aggregate({
        where: { assistantId, createdAt: { gte: startOfDay } },
        _sum: { amount: true },
      }),
      this.prisma.earning.aggregate({
        where: { assistantId, createdAt: { gte: startOfWeek } },
        _sum: { amount: true },
      }),
      this.prisma.earning.aggregate({
        where: { assistantId },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.earning.findMany({
        where: { assistantId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    const profile = await this.prisma.assistantProfile.findUnique({
      where: { userId: assistantId },
    });

    return {
      todayEarnings: today._sum.amount ?? 0,
      weeklyEarnings: week._sum.amount ?? 0,
      totalEarnings: total._sum.amount ?? 0,
      totalJobs: profile?.totalJobs ?? total._count,
      history,
      payoutDetails: {
        bankAccount: profile?.bankAccount ? '****' + profile.bankAccount.slice(-4) : null,
        ifscCode: profile?.ifscCode,
        nextPayoutDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
    };
  }
}
