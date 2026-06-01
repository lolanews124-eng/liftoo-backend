import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  async create(
    customerId: string,
    bookingId: string,
    stars: number,
    comment?: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true, rating: true },
    });
    if (!booking || booking.customerId !== customerId) {
      throw new BadRequestException('Invalid booking');
    }
    if (booking.status !== BookingStatus.completed) {
      throw new BadRequestException('Booking not completed');
    }
    if (!booking.assistantId) {
      throw new BadRequestException('No assistant assigned');
    }
    if (!booking.payment || booking.payment.status !== PaymentStatus.completed) {
      throw new BadRequestException('Payment required before review');
    }
    if (booking.rating) {
      throw new BadRequestException('Booking already rated');
    }

    const rating = await this.prisma.rating.create({
      data: {
        bookingId,
        customerId,
        assistantId: booking.assistantId,
        stars,
        comment,
      },
    });

    const [avg, reviewCount, profile] = await Promise.all([
      this.prisma.rating.aggregate({
        where: { assistantId: booking.assistantId },
        _avg: { stars: true },
      }),
      this.prisma.rating.count({ where: { assistantId: booking.assistantId } }),
      this.prisma.assistantProfile.findUnique({ where: { userId: booking.assistantId } }),
    ]);

    if (avg._avg.stars) {
      await this.prisma.assistantProfile.update({
        where: { userId: booking.assistantId },
        data: { rating: avg._avg.stars },
      });
    }

    return {
      ...rating,
      nextStep: 'rate_app',
      assistantStats: {
        rating: avg._avg.stars ?? profile?.rating ?? 5,
        totalJobs: profile?.totalJobs ?? 0,
        reviewCount,
      },
    };
  }
}
