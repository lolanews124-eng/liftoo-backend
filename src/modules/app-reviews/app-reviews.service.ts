import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AppReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    stars: number,
    options?: { bookingId?: string; comment?: string; platform?: string },
  ) {
    if (options?.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: options.bookingId },
        include: { rating: true, payment: true },
      });
      if (!booking || booking.customerId !== userId) {
        throw new BadRequestException('Invalid booking');
      }
      if (!booking.payment || booking.payment.status !== 'completed') {
        throw new BadRequestException('Payment required before app review');
      }
      if (!booking.rating) {
        throw new BadRequestException('Service review required first');
      }
      const existing = await this.prisma.appReview.findUnique({
        where: { bookingId: options.bookingId },
      });
      if (existing) {
        throw new BadRequestException('App review already submitted');
      }
    }

    return this.prisma.appReview.create({
      data: {
        userId,
        bookingId: options?.bookingId,
        stars,
        comment: options?.comment,
        platform: options?.platform,
      },
    });
  }
}
