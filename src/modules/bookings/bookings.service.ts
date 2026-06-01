import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { haversineKm, isWithinRadiusKm } from '../../common/utils/geo.util';
import { CategoriesService } from '../categories/categories.service';
import { BookingEventsService } from './booking-events.service';
import { WalletService } from '../wallet/wallet.service';
import { ReferralsService } from '../referrals/referrals.service';
import { EarningsService } from '../earnings/earnings.service';
import { PaymentGatewayService } from '../wallet/payment-gateway.service';
import { PlatformSettingsService } from '../settings/platform-settings.service';
import { CreateBookingDto } from './dto/booking.dto';

const bookingInclude = {
  category: true,
  customer: {
    select: { id: true, name: true, phone: true, avatarUrl: true },
  },
  assistant: {
    select: {
      id: true,
      name: true,
      phone: true,
      avatarUrl: true,
      assistantProfile: true,
    },
  },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  payment: true,
  rating: true,
  appReview: true,
} satisfies Prisma.BookingInclude;

type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private categories: CategoriesService,
    private events: BookingEventsService,
    private config: ConfigService,
    private wallet: WalletService,
    private referrals: ReferralsService,
    private earnings: EarningsService,
    private paymentGateway: PaymentGatewayService,
    private platformSettings: PlatformSettingsService,
  ) {}

  private bookingInclude = bookingInclude;

  private async getSettings() {
    return this.platformSettings.get();
  }

  async create(customerId: string, dto: CreateBookingDto) {
    const category = await this.categories.findById(dto.categoryId);
    if (!category) throw new NotFoundException('Category not found');

    const hours = dto.durationMin / 60;
    const serviceFee = Math.round(category.baseRate * hours);
    const settings = await this.getSettings();
    const platformFee = Math.round(serviceFee * (settings.platformFeePercent / 100));
    const totalAmount = serviceFee + platformFee;

    const booking = await this.prisma.booking.create({
      data: {
        customerId,
        categoryId: dto.categoryId,
        cityId: dto.cityId,
        durationMin: dto.durationMin,
        venueName: dto.venueName,
        scheduledAt: new Date(dto.scheduledAt),
        addressLabel: dto.addressLabel,
        addressFormatted: dto.addressFormatted,
        lat: dto.lat,
        lng: dto.lng,
        serviceFee,
        platformFee,
        totalAmount,
        status: BookingStatus.pending,
        statusHistory: {
          create: { status: BookingStatus.pending, note: 'Booking created' },
        },
      },
      include: this.bookingInclude,
    });

    return booking;
  }

  async confirm(customerId: string, bookingId: string) {
    const booking = await this.getAndAuthorize(bookingId, customerId, 'customer');
    if (booking.status !== BookingStatus.pending) {
      throw new BadRequestException('Booking cannot be confirmed');
    }

    const updated = await this.transition(bookingId, BookingStatus.searching, 'Searching for assistant');

    await this.dispatchNextBatch(bookingId);
    const fresh = await this.findOneRaw(bookingId);
    if (fresh) await this.events.emitBookingUpdate(fresh, BookingStatus.searching);

    return fresh ?? updated;
  }

  async findForCustomer(customerId: string, status?: string) {
    const statuses = this.parseStatusFilter(status);
    const bookings = await this.prisma.booking.findMany({
      where: {
        customerId,
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      include: this.bookingInclude,
      orderBy: { createdAt: 'desc' },
    });

    const results: BookingWithRelations[] = [];
    for (const booking of bookings) {
      results.push(await this.maybeTimeoutSearch(booking));
    }
    return results.map((b) => this.sanitizeBooking(b, customerId, 'customer'));
  }

  async findNearbyRequests(assistantId: string) {
    await this.ensureAssistant(assistantId);

    const availability = await this.prisma.assistantAvailability.findUnique({
      where: { userId: assistantId },
    });
    if (!availability?.isOnline) {
      return [];
    }

    const rejectedIds = await this.getRejectedBookingIds(assistantId);
    const settings = await this.getSettings();
    const assistantLat = availability.lastLat;
    const assistantLng = availability.lastLng;

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.searching,
        assistantId: null,
        notifiedAssistantIds: { has: assistantId },
        id: rejectedIds.length ? { notIn: rejectedIds } : undefined,
      },
      include: this.bookingInclude,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return bookings
      .filter((booking) =>
        this.isBookingInRange(
          booking.lat,
          booking.lng,
          assistantLat,
          assistantLng,
          settings.matchRadiusKm,
        ),
      )
      .map((booking) => ({
        ...this.sanitizeBooking(booking, assistantId, 'assistant'),
        distanceKm: this.distanceLabel(
          booking.lat,
          booking.lng,
          assistantLat,
          assistantLng,
        ),
      }))
      .sort((a, b) => Number(a.distanceKm ?? 99) - Number(b.distanceKm ?? 99));
  }

  async findForAssistant(assistantId: string, status?: string) {
    await this.ensureAssistant(assistantId);
    const statuses = this.parseStatusFilter(status);
    const bookings = await this.prisma.booking.findMany({
      where: {
        assistantId,
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      include: this.bookingInclude,
      orderBy: { createdAt: 'desc' },
    });
    return bookings.map((b) => this.sanitizeBooking(b, assistantId, 'assistant'));
  }

  async getActiveJob(assistantId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        assistantId,
        status: {
          in: [
            BookingStatus.assigned,
            BookingStatus.arriving,
            BookingStatus.started,
          ],
        },
      },
      include: this.bookingInclude,
    });
    return booking ? this.sanitizeBooking(booking, assistantId, 'assistant') : null;
  }

  async findOne(id: string, userId: string) {
    let booking = await this.findOneRaw(id);
    if (!booking) throw new NotFoundException('Booking not found');

    const isCustomer = booking.customerId === userId;
    const isAssistant = booking.assistantId === userId;

    if (!isCustomer && !isAssistant) {
      const availability = await this.prisma.assistantAvailability.findUnique({
        where: { userId },
      });
      const inBatch =
        booking.status === BookingStatus.searching &&
        booking.notifiedAssistantIds.includes(userId);
      const canViewSearching = inBatch && availability?.isOnline;
      if (!canViewSearching) throw new ForbiddenException();
    }

    if (isCustomer) {
      booking = await this.maybeTimeoutSearch(booking);
    }

    const role = isCustomer ? 'customer' : isAssistant ? 'assistant' : 'assistant';
    const sanitized = this.sanitizeBooking(booking, userId, role);
    return this.enrichBookingView(sanitized, role);
  }

  async accept(assistantId: string, bookingId: string) {
    await this.ensureAssistant(assistantId);

    const availability = await this.prisma.assistantAvailability.findUnique({
      where: { userId: assistantId },
    });
    if (!availability?.isOnline) {
      throw new BadRequestException('Go online to accept bookings');
    }

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.status !== BookingStatus.searching) {
      throw new BadRequestException('Booking not available');
    }

    const rejected = await this.prisma.bookingRejection.findUnique({
      where: { bookingId_assistantId: { bookingId, assistantId } },
    });
    if (rejected) {
      throw new BadRequestException('You already rejected this booking');
    }

    if (!booking.notifiedAssistantIds.includes(assistantId)) {
      throw new BadRequestException('This booking was not offered to you');
    }

    if (booking.customerId === assistantId) {
      throw new BadRequestException('You cannot accept your own booking');
    }

    const settings = await this.getSettings();
    if (
      !this.isBookingInRange(
        booking.lat,
        booking.lng,
        availability.lastLat,
        availability.lastLng,
        settings.matchRadiusKm,
      )
    ) {
      throw new BadRequestException('Booking is outside your service radius');
    }

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const result = await this.prisma.booking.updateMany({
      where: {
        id: bookingId,
        status: BookingStatus.searching,
        assistantId: null,
      },
      data: {
        assistantId,
        status: BookingStatus.assigned,
        serviceOtp: otp,
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    if (result.count === 0) {
      throw new ConflictException('Booking was already accepted by another assistant');
    }

    await this.prisma.bookingStatusHistory.create({
      data: {
        bookingId,
        status: BookingStatus.assigned,
        note: 'Assistant accepted',
      },
    });

    const updated = await this.findOneRaw(bookingId);
    if (!updated) throw new NotFoundException();

    await this.events.emitBookingUpdate(updated, BookingStatus.assigned);
    return this.sanitizeBooking(updated, assistantId, 'assistant');
  }

  async reject(assistantId: string, bookingId: string, reason: string) {
    await this.ensureAssistant(assistantId);
    if (!reason?.trim() || reason.trim().length < 3) {
      throw new BadRequestException('Rejection reason is required');
    }

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.status !== BookingStatus.searching) {
      throw new BadRequestException('Booking not available');
    }
    if (!booking.notifiedAssistantIds.includes(assistantId)) {
      throw new BadRequestException('This booking was not offered to you');
    }

    await this.prisma.bookingRejection.upsert({
      where: { bookingId_assistantId: { bookingId, assistantId } },
      create: { bookingId, assistantId, reason: reason.trim() },
      update: { reason: reason.trim() },
    });

    const allNotifiedRejected = await this.haveAllNotifiedRejected(bookingId);
    if (allNotifiedRejected) {
      await this.dispatchNextBatch(bookingId);
      const fresh = await this.findOneRaw(bookingId);
      if (fresh?.status === BookingStatus.cancelled) {
        return { message: 'Booking rejected', bookingCancelled: true };
      }
    }

    return { message: 'Booking rejected', bookingCancelled: false };
  }

  async setArriving(assistantId: string, bookingId: string) {
    await this.getAndAuthorize(bookingId, assistantId, 'assistant');
    const updated = await this.transition(bookingId, BookingStatus.arriving, 'Assistant en route');
    await this.events.emitBookingUpdate(updated, BookingStatus.arriving);
    return this.sanitizeBooking(updated, assistantId, 'assistant');
  }

  async verifyOtp(userId: string, bookingId: string, otp: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException();
    if (booking.assistantId !== userId && booking.customerId !== userId) {
      throw new ForbiddenException();
    }
    if (!booking.serviceOtp || booking.serviceOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }
    if (booking.otpExpiresAt && booking.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    const updated = await this.transition(bookingId, BookingStatus.started, 'Service started via OTP');
    await this.events.emitBookingUpdate(updated, BookingStatus.started);

    const role = booking.customerId === userId ? 'customer' : 'assistant';
    return this.sanitizeBooking(updated, userId, role);
  }

  async complete(assistantId: string, bookingId: string) {
    await this.getAndAuthorize(bookingId, assistantId, 'assistant');
    const updated = await this.transition(bookingId, BookingStatus.completed, 'Service completed');

    await this.prisma.assistantProfile.update({
      where: { userId: assistantId },
      data: { totalJobs: { increment: 1 } },
    });

    const settings = await this.getSettings();
    const payoutPercent =
      updated.category?.assistantPayoutPercent ?? settings.assistantEarningPercent;
    const assistantEarning = Math.round(updated.serviceFee * (payoutPercent / 100));
    await this.earnings.credit(assistantId, assistantEarning, bookingId);

    await this.referrals.processReferralReward(updated.customerId);
    await this.events.emitBookingUpdate(updated, BookingStatus.completed);

    return {
      ...this.sanitizeBooking(updated, assistantId, 'assistant'),
      assistantEarning,
      requiresPayment: true,
    };
  }

  async cancel(userId: string, bookingId: string, reason?: string, note?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException();
    if (booking.customerId !== userId && booking.assistantId !== userId) {
      throw new ForbiddenException();
    }
    if (
      booking.status === BookingStatus.completed ||
      booking.status === BookingStatus.cancelled
    ) {
      throw new BadRequestException('Cannot cancel this booking');
    }

    const cancelNote = [reason, note].filter(Boolean).join(' — ') || 'Cancelled by user';
    const settings = await this.getSettings();
    let cancellationFee = 0;

    if (booking.customerId === userId) {
      const minsUntil = (booking.scheduledAt.getTime() - Date.now()) / 60000;
      const isLate =
        minsUntil < settings.cancellationFreeBeforeMin &&
        booking.status !== BookingStatus.pending &&
        booking.status !== BookingStatus.searching;
      if (isLate) {
        cancellationFee = Math.max(
          settings.minCancellationFee,
          Math.round(booking.totalAmount * (settings.cancellationFeePercent / 100)),
        );
      }
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.cancelled,
        cancellationFee,
        statusHistory: { create: { status: BookingStatus.cancelled, note: cancelNote } },
      },
      include: this.bookingInclude,
    });

    if (cancellationFee > 0) {
      try {
        await this.wallet.debit(
          userId,
          cancellationFee,
          `Cancellation fee for booking ${bookingId.slice(0, 8)}`,
          bookingId,
        );
      } catch {
        // Wallet insufficient — fee recorded on booking
      }
    }

    await this.events.emitBookingUpdate(updated, BookingStatus.cancelled);

    const role = booking.customerId === userId ? 'customer' : 'assistant';
    return {
      ...this.sanitizeBooking(updated, userId, role),
      cancellationFee,
    };
  }

  async pay(customerId: string, bookingId: string, method: PaymentMethod) {
    const booking = await this.getAndAuthorize(bookingId, customerId, 'customer');
    if (booking.status !== BookingStatus.completed) {
      throw new BadRequestException('Booking not completed');
    }

    if (method === PaymentMethod.wallet) {
      await this.wallet.debit(
        customerId,
        booking.totalAmount,
        `Payment for booking ${bookingId.slice(0, 8)}`,
        bookingId,
      );
    } else {
      await this.paymentGateway.initiatePayment({
        bookingId,
        amount: booking.totalAmount,
        method,
        customerId,
      });
    }
    const payment = await this.prisma.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        method,
        amount: booking.totalAmount,
        status: PaymentStatus.completed,
      },
      update: { method, status: PaymentStatus.completed },
    });

    const updated = await this.findOneRaw(bookingId);

    const wallet =
      method === PaymentMethod.wallet
        ? await this.prisma.wallet.findUnique({ where: { userId: customerId } })
        : null;

    return {
      payment,
      booking: updated ? this.sanitizeBooking(updated, customerId, 'customer') : null,
      nextStep: this.resolveNextStep(updated),
      walletBalance: wallet?.balance,
    };
  }

  resolveNextStep(booking: {
    status: BookingStatus;
    payment: { status: PaymentStatus } | null;
    rating: unknown | null;
    appReview: unknown | null;
  } | null) {
    if (!booking || booking.status !== BookingStatus.completed) return 'track';
    if (!booking.payment || booking.payment.status !== PaymentStatus.completed) return 'pay';
    if (!booking.rating) return 'rate_service';
    if (!booking.appReview) return 'rate_app';
    return 'done';
  }

  private async findOneRaw(id: string) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: this.bookingInclude,
    });
  }

  private async getRejectedBookingIds(assistantId: string) {
    const rows = await this.prisma.bookingRejection.findMany({
      where: { assistantId },
      select: { bookingId: true },
    });
    return rows.map((r) => r.bookingId);
  }

  private async getEligibleAssistantsSorted(
    booking: { id: string; customerId: string; lat: number; lng: number; offeredAssistantIds: string[] },
  ) {
    const settings = await this.getSettings();
    const rejected = await this.prisma.bookingRejection.findMany({
      where: { bookingId: booking.id },
      select: { assistantId: true },
    });
    const excluded = new Set([
      ...rejected.map((r) => r.assistantId),
      ...booking.offeredAssistantIds,
    ]);

    const online = await this.prisma.assistantAvailability.findMany({
      where: { isOnline: true },
      include: { user: { include: { assistantProfile: true } } },
    });

    return online
      .filter((a) => a.user.assistantProfile?.adminVerified)
      .filter((a) => a.userId !== booking.customerId)
      .filter((a) => !excluded.has(a.userId))
      .filter((a) =>
        this.isBookingInRange(
          booking.lat,
          booking.lng,
          a.lastLat,
          a.lastLng,
          settings.matchRadiusKm,
        ),
      )
      .map((a) => ({
        userId: a.userId,
        distanceKm: haversineKm(
          a.lastLat ?? booking.lat,
          a.lastLng ?? booking.lng,
          booking.lat,
          booking.lng,
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  private async haveAllNotifiedRejected(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking?.notifiedAssistantIds.length) return false;
    const rejections = await this.prisma.bookingRejection.count({
      where: {
        bookingId,
        assistantId: { in: booking.notifiedAssistantIds },
      },
    });
    return rejections >= booking.notifiedAssistantIds.length;
  }

  private async dispatchNextBatch(bookingId: string) {
    const booking = await this.findOneRaw(bookingId);
    if (!booking || booking.status !== BookingStatus.searching) return;

    const settings = await this.getSettings();
    const eligible = await this.getEligibleAssistantsSorted(booking);

    if (eligible.length === 0) {
      if (booking.notifiedAssistantIds.length === 0) {
        const cancelled = await this.transition(
          bookingId,
          BookingStatus.cancelled,
          'No verified assistants available nearby',
        );
        await this.events.emitBookingUpdate(cancelled, BookingStatus.cancelled);
      }
      return;
    }

    const batch = eligible.slice(0, settings.matchBatchSize).map((e) => e.userId);
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        dispatchRound: { increment: 1 },
        notifiedAssistantIds: batch,
        offeredAssistantIds: [...booking.offeredAssistantIds, ...batch],
      },
      include: this.bookingInclude,
    });

    this.events.emitBookingRequest(batch, updated);
  }

  private async getEligibleAssistantIds(
    booking: { id: string; customerId: string; lat: number; lng: number; offeredAssistantIds: string[] },
  ): Promise<string[]> {
    const sorted = await this.getEligibleAssistantsSorted(booking);
    return sorted.map((a) => a.userId);
  }

  private isBookingInRange(
    bookingLat: number,
    bookingLng: number,
    assistantLat: number | null | undefined,
    assistantLng: number | null | undefined,
    radiusKm: number,
  ) {
    if (assistantLat == null || assistantLng == null) return false;
    return isWithinRadiusKm(assistantLat, assistantLng, bookingLat, bookingLng, radiusKm);
  }

  private distanceLabel(
    bookingLat: number,
    bookingLng: number,
    assistantLat: number | null | undefined,
    assistantLng: number | null | undefined,
  ) {
    if (assistantLat == null || assistantLng == null) return null;
    return haversineKm(assistantLat, assistantLng, bookingLat, bookingLng).toFixed(1);
  }

  private async maybeTimeoutSearch(booking: BookingWithRelations): Promise<BookingWithRelations> {
    if (booking.status !== BookingStatus.searching) return booking;

    const timeoutMin = (await this.getSettings()).bookingSearchTimeoutMin;
    const ageMs = Date.now() - booking.createdAt.getTime();
    if (ageMs < timeoutMin * 60 * 1000) return booking;

    const eligible = await this.getEligibleAssistantIds(booking);
    if (eligible.length > 0) return booking;

    const cancelled = await this.transition(
      booking.id,
      BookingStatus.cancelled,
      'Search timeout — no assistant found nearby',
    );
    await this.events.emitBookingUpdate(cancelled, BookingStatus.cancelled);
    return cancelled;
  }

  private sanitizeBooking(
    booking: BookingWithRelations,
    viewerUserId: string,
    role: 'customer' | 'assistant',
  ): BookingWithRelations & { distanceKm?: string | null } {
    const isCustomer = booking.customerId === viewerUserId;
    const isAssignedAssistant = booking.assistantId === viewerUserId;

    let result: Record<string, unknown> = { ...booking };

    if (role === 'assistant' && !isCustomer) {
      result = {
        ...result,
        serviceOtp: undefined,
        customer: booking.status === BookingStatus.searching
          ? { id: booking.customer.id, name: booking.customer.name }
          : booking.customer,
      };
    }

    if (isCustomer || isAssignedAssistant) {
      // Customer and assigned assistant see full booking including OTP for customer only
      if (!isCustomer) {
        result = { ...result, serviceOtp: undefined };
      }
    }

    return result as BookingWithRelations & { distanceKm?: string | null };
  }

  private async enrichBookingView(
    booking: BookingWithRelations & { distanceKm?: string | null },
    role: 'customer' | 'assistant',
  ) {
    if (role !== 'customer') return booking;

    const extra: Record<string, unknown> = {};

    if (booking.status === BookingStatus.searching) {
      extra.searchAvailability = await this.buildSearchAvailability(booking);
    }

    if (
      booking.assistantId &&
      ([BookingStatus.assigned, BookingStatus.arriving, BookingStatus.started] as BookingStatus[]).includes(
        booking.status,
      )
    ) {
      extra.tracking = await this.buildTracking(booking);
    }

    return { ...booking, ...extra };
  }

  private async buildSearchAvailability(booking: {
    id: string;
    customerId: string;
    lat: number;
    lng: number;
    venueName: string;
    offeredAssistantIds: string[];
    notifiedAssistantIds: string[];
  }) {
    const settings = await this.getSettings();
    const eligible = await this.getEligibleAssistantsSorted(booking);
    const zones = [
      {
        label: 'Within 2 km',
        count: eligible.filter((a) => a.distanceKm <= 2).length,
      },
      {
        label: '2–5 km',
        count: eligible.filter((a) => a.distanceKm > 2 && a.distanceKm <= 5).length,
      },
      {
        label: `5–${settings.matchRadiusKm} km`,
        count: eligible.filter(
          (a) => a.distanceKm > 5 && a.distanceKm <= settings.matchRadiusKm,
        ).length,
      },
    ].filter((z) => z.count > 0);

    const nearby = eligible.length;
    return {
      nearbyAvailable: nearby,
      matchRadiusKm: settings.matchRadiusKm,
      areaLabel: booking.venueName,
      zones,
      notifiedCount: booking.notifiedAssistantIds.length,
      message:
        nearby > 0
          ? `${nearby} assistant${nearby === 1 ? '' : 's'} available near ${booking.venueName}`
          : 'Searching wider area for verified assistants…',
    };
  }

  private async buildTracking(booking: BookingWithRelations) {
    const av = booking.assistantId
      ? await this.prisma.assistantAvailability.findUnique({
          where: { userId: booking.assistantId },
        })
      : null;

    const aLat = av?.lastLat ?? null;
    const aLng = av?.lastLng ?? null;
    const distanceKm =
      aLat != null && aLng != null
        ? haversineKm(aLat, aLng, booking.lat, booking.lng)
        : null;
    const etaMinutes =
      distanceKm != null ? Math.max(2, Math.ceil((distanceKm / 22) * 60)) : null;

    const statusMessage =
      booking.status === BookingStatus.assigned
        ? 'Assistant confirmed — getting ready to leave'
        : booking.status === BookingStatus.arriving
          ? distanceKm != null && distanceKm <= 0.3
            ? 'Assistant has reached your location'
            : 'Assistant is on the way to you'
          : 'Service in progress at your location';

    const progress =
      booking.status === BookingStatus.assigned
        ? 0.25
        : booking.status === BookingStatus.arriving
          ? distanceKm != null
            ? Math.min(0.95, Math.max(0.35, 1 - distanceKm / 8))
            : 0.5
          : 1;

    return {
      customer: {
        lat: booking.lat,
        lng: booking.lng,
        label: booking.venueName,
        address: booking.addressFormatted,
      },
      assistant:
        aLat != null && aLng != null
          ? {
              lat: aLat,
              lng: aLng,
              name: booking.assistant?.name ?? 'Assistant',
            }
          : null,
      distanceKm: distanceKm != null ? distanceKm.toFixed(1) : null,
      etaMinutes,
      statusMessage,
      progress,
    };
  }

  private async transition(bookingId: string, status: BookingStatus, note: string) {
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status,
        statusHistory: { create: { status, note } },
      },
      include: this.bookingInclude,
    });
  }

  private async getAndAuthorize(
    bookingId: string,
    userId: string,
    role: 'customer' | 'assistant',
  ) {
    const booking = await this.findOneRaw(bookingId);
    if (!booking) throw new NotFoundException();
    if (role === 'customer' && booking.customerId !== userId) {
      throw new ForbiddenException();
    }
    if (role === 'assistant' && booking.assistantId !== userId) {
      throw new ForbiddenException();
    }
    return booking;
  }

  private async ensureAssistant(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { assistantProfile: true },
    });
    if (!user?.roles.includes(UserRole.assistant)) {
      throw new ForbiddenException('Not an assistant');
    }
    if (!user.assistantProfile?.adminVerified) {
      throw new ForbiddenException(
        'Your account is pending admin verification. Complete KYC and wait for admin approval.',
      );
    }
  }

  private parseStatusFilter(status?: string): BookingStatus[] | undefined {
    if (!status) return undefined;
    if (status === 'upcoming') {
      return [
        BookingStatus.pending,
        BookingStatus.searching,
        BookingStatus.assigned,
        BookingStatus.arriving,
        BookingStatus.started,
      ];
    }
    if (status === 'completed') return [BookingStatus.completed];
    if (status === 'cancelled') return [BookingStatus.cancelled];
    return undefined;
  }
}
