import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PromoDiscountType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PromosService {
  constructor(private prisma: PrismaService) {}

  async validate(code: string, orderAmount: number) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!promo || !promo.isActive) {
      throw new BadRequestException('Invalid promo code');
    }
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException('Promo code expired');
    }
    if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Promo code usage limit reached');
    }

    let discount = 0;
    if (promo.discountType === PromoDiscountType.fixed) {
      discount = Math.min(promo.discountValue, orderAmount);
    } else {
      discount = Math.round(orderAmount * (promo.discountValue / 100));
    }

    return {
      promoId: promo.id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discountAmount: discount,
      finalAmount: Math.max(0, orderAmount - discount),
    };
  }

  async applyToBooking(bookingId: string, code: string, customerId?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (customerId && booking.customerId !== customerId) {
      throw new ForbiddenException();
    }
    if (booking.promoCodeId) {
      throw new BadRequestException('Promo already applied');
    }

    const subtotal = booking.serviceFee + booking.platformFee;
    const result = await this.validate(code, subtotal);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.promoCode.update({
        where: { id: result.promoId },
        data: { usedCount: { increment: 1 } },
      });
      return tx.booking.update({
        where: { id: bookingId },
        data: {
          promoCodeId: result.promoId,
          discountAmount: result.discountAmount,
          totalAmount: result.finalAmount,
        },
      });
    });

    return { booking: updated, ...result };
  }

  async create(data: {
    code: string;
    discountType: PromoDiscountType;
    discountValue: number;
    maxUses?: number;
    expiresAt?: string;
  }) {
    return this.prisma.promoCode.create({
      data: {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });
  }

  async list() {
    return this.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async toggle(id: string, isActive: boolean) {
    return this.prisma.promoCode.update({ where: { id }, data: { isActive } });
  }
}
