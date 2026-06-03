import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  BroadcastAudience,
  NotificationType,
  PaymentStatus,
  Prisma,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { VerificationService } from '../assistants/verification.service';
import { PlatformSettingsService } from '../settings/platform-settings.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { PromosService } from '../promos/promos.service';
import { PayoutsService } from '../payouts/payouts.service';
import { SupportService } from '../support/support.service';
import {
  AdminBookingsQueryDto,
  AdminUsersQueryDto,
  AdminVerificationsQueryDto,
  CreateCategoryDto,
  CreateCityDto,
  PaginationQueryDto,
  UpdateAdminUserDto,
  UpdateBookingStatusDto,
  UpdateCategoryDto,
  UpdateCityDto,
  UpdatePlatformSettingsDto,
  AdminReviewVerificationDto,
  VerifyAssistantDto,
  CreatePromoDto,
  ProcessPayoutDto,
  UpdateSupportTicketDto,
  AdminBroadcastNotificationDto,
} from './dto/admin.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminDevStore } from './admin-dev.store';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private verificationService: VerificationService,
    private platformSettings: PlatformSettingsService,
    private auditLog: AuditLogService,
    private promos: PromosService,
    private payouts: PayoutsService,
    private support: SupportService,
    private notifications: NotificationsService,
  ) {}

  private get dev() {
    return AdminDevStore.getInstance();
  }

  private useDev() {
    return !this.prisma.dbReady;
  }

  private paginate(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    return { take, skip };
  }

  async getDashboardStats() {
    if (this.useDev()) {
      return {
        users: { total: this.dev.users.length, customers: 1, assistants: 2 },
        bookings: { total: this.dev.bookings.length, active: 1, completed: 1 },
        pendingVerifications: 2,
        revenue: { total: 275, platform: 27.5, pendingPayouts: 220 },
        pendingPayments: 0,
        openSupportTickets: 0,
        recentBookings: this.dev.bookings,
      };
    }

    const [
      totalCustomers,
      totalAssistants,
      totalBookings,
      activeBookings,
      completedBookings,
      pendingVerifications,
      totalRevenue,
      platformRevenue,
      pendingPayouts,
      pendingPayments,
      openSupportTickets,
    ] = await Promise.all([
      this.prisma.user.count({ where: { roles: { has: UserRole.customer } } }),
      this.prisma.user.count({ where: { roles: { has: UserRole.assistant } } }),
      this.prisma.booking.count(),
      this.prisma.booking.count({
        where: {
          status: {
            in: [
              BookingStatus.pending,
              BookingStatus.searching,
              BookingStatus.assigned,
              BookingStatus.arriving,
              BookingStatus.started,
            ],
          },
        },
      }),
      this.prisma.booking.count({ where: { status: BookingStatus.completed } }),
      this.prisma.assistantVerificationDocument.count({
        where: { status: VerificationStatus.pending },
      }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.completed },
        _sum: { amount: true },
      }),
      this.prisma.booking.aggregate({
        where: { status: BookingStatus.completed },
        _sum: { platformFee: true },
      }),
      this.prisma.earning.aggregate({
        where: { isPaidOut: false },
        _sum: { amount: true },
      }),
      this.prisma.booking.count({
        where: {
          status: BookingStatus.completed,
          OR: [{ payment: null }, { payment: { status: PaymentStatus.pending } }],
        },
      }),
      this.prisma.supportTicket.count({
        where: { status: { in: ['open', 'in_progress'] } },
      }),
    ]);

    const recentBookings = await this.prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        category: { select: { name: true } },
      },
    });

    return {
      users: {
        total: totalCustomers + totalAssistants,
        customers: totalCustomers,
        assistants: totalAssistants,
      },
      bookings: {
        total: totalBookings,
        active: activeBookings,
        completed: completedBookings,
      },
      pendingVerifications,
      revenue: {
        total: totalRevenue._sum.amount ?? 0,
        platform: platformRevenue._sum.platformFee ?? 0,
        pendingPayouts: pendingPayouts._sum.amount ?? 0,
      },
      pendingPayments,
      openSupportTickets,
      recentBookings,
    };
  }

  async listUsers(query: AdminUsersQueryDto) {
    if (this.useDev()) {
      let items = [...this.dev.users];
      if (query.role) items = items.filter((u) => u.roles.includes(query.role as UserRole));
      if (query.search) {
        const q = query.search.toLowerCase();
        items = items.filter(
          (u) => u.name?.toLowerCase().includes(q) || u.phone.includes(q),
        );
      }
      return { items, total: items.length, page: query.page ?? 1, limit: 20 };
    }

    const { take, skip } = this.paginate(query.page, query.limit);
    const where: Prisma.UserWhereInput = {
      roles: { hasSome: [UserRole.customer, UserRole.assistant] },
    };
    if (query.role) where.roles = { has: query.role };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: { select: { balance: true } },
          assistantProfile: {
            select: {
              rating: true,
              totalJobs: true,
              assistantCode: true,
              adminVerified: true,
            },
          },
          availability: { select: { isOnline: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        roles: u.roles,
        activeRole: u.activeRole,
        isSuspended: u.isSuspended,
        walletBalance: u.wallet?.balance ?? 0,
        rating: u.assistantProfile?.rating,
        totalJobs: u.assistantProfile?.totalJobs,
        assistantCode: u.assistantProfile?.assistantCode,
        adminVerified: u.assistantProfile?.adminVerified ?? false,
        isOnline: u.availability?.isOnline ?? false,
        createdAt: u.createdAt,
      })),
      total,
      page: query.page ?? 1,
      limit: take,
    };
  }

  async getUser(id: string) {
    if (this.useDev()) {
      const user = this.dev.users.find((u) => u.id === id);
      if (!user) throw new NotFoundException('User not found');
      return { ...user, wallet: { balance: user.walletBalance, transactions: [] } };
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        wallet: { include: { transactions: { take: 10, orderBy: { createdAt: 'desc' } } } },
        assistantProfile: true,
        customerProfile: true,
        availability: true,
        addresses: true,
        bookingsAsCustomer: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { category: true, payment: true },
        },
        bookingsAsAssistant: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { category: true, customer: { select: { name: true, phone: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUser(id: string, dto: UpdateAdminUserDto) {
    if (this.useDev()) {
      const user = this.dev.users.find((u) => u.id === id);
      if (!user) throw new NotFoundException('User not found');
      if (dto.name != null) user.name = dto.name;
      if (dto.isSuspended != null) user.isSuspended = dto.isSuspended;
      return user;
    }

    await this.getUser(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        isSuspended: dto.isSuspended,
        roles: dto.roles,
      },
    });

    if (dto.isSuspended === true) {
      await this.prisma.assistantAvailability.updateMany({
        where: { userId: id },
        data: { isOnline: false },
      });
    }

    return updated;
  }

  async listAssistants(query: PaginationQueryDto) {
    return this.listUsers({ ...query, role: UserRole.assistant });
  }

  async listVerifications(query: AdminVerificationsQueryDto) {
    if (this.useDev()) {
      return {
        items: this.dev.verifications,
        total: this.dev.verifications.length,
        page: query.page ?? 1,
        limit: 20,
      };
    }

    const { take, skip } = this.paginate(query.page, query.limit);
    const status = query.status ?? VerificationStatus.pending;

    const docs = await this.prisma.assistantVerificationDocument.findMany({
      where: { status },
      skip,
      take,
      orderBy: { uploadedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
            assistantProfile: { select: { rating: true, totalJobs: true } },
          },
        },
      },
    });

    const grouped = new Map<string, typeof docs>();
    for (const doc of docs) {
      const list = grouped.get(doc.userId) ?? [];
      list.push(doc);
      grouped.set(doc.userId, list);
    }

    const items = Array.from(grouped.entries()).map(([userId, documents]) => ({
      userId,
      user: documents[0].user,
      pendingCount: documents.filter((d) => d.status === VerificationStatus.pending).length,
      documents: documents.map((d) => ({
        type: d.type,
        status: d.status,
        fileUrl: d.fileUrl,
        textValue: d.textValue,
        metadata: d.metadata,
        adminNote: d.adminNote,
        uploadedAt: d.uploadedAt,
      })),
    }));

    const total = await this.prisma.assistantVerificationDocument.count({ where: { status } });
    return { items, total, page: query.page ?? 1, limit: take };
  }

  async getVerification(userId: string) {
    if (this.useDev()) {
      const user = this.dev.users.find((u) => u.id === userId);
      if (!user) throw new NotFoundException('User not found');
      const detail = this.dev.verificationDetails[userId];
      return {
        user: { id: user.id, name: user.name, phone: user.phone },
        documents: detail?.documents ?? [],
        summary: detail?.summary ?? { completionPercent: 0, fullyVerified: false, pendingCount: 0 },
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, avatarUrl: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const bundle = await this.verificationService.getVerificationBundle(userId);
    return { user, ...bundle };
  }

  async reviewVerification(adminId: string, dto: AdminReviewVerificationDto) {
    if (this.useDev()) {
      const detail = this.dev.verificationDetails[dto.userId];
      if (!detail) throw new NotFoundException('Verification not found');
      const doc = detail.documents.find((d: { type: string }) => d.type === dto.type) as
        | { type: string; status: string }
        | undefined;
      if (!doc) throw new NotFoundException('Document not found');
      doc.status = dto.status;
      return this.getVerification(dto.userId);
    }

    return this.verificationService.reviewDocument({
      ...dto,
      verifiedBy: adminId,
    });
  }

  async listBookings(query: AdminBookingsQueryDto) {
    if (this.useDev()) {
      let items = [...this.dev.bookings];
      if (query.status) items = items.filter((b) => b.status === query.status);
      return { items, total: items.length, page: query.page ?? 1, limit: 20 };
    }

    const { take, skip } = this.paginate(query.page, query.limit);
    const where: Prisma.BookingWhereInput = {};
    const and: Prisma.BookingWhereInput[] = [];
    if (query.paymentPending === 'true' || query.paymentPending === '1') {
      and.push({ status: BookingStatus.completed });
      and.push({
        OR: [{ payment: null }, { payment: { status: PaymentStatus.pending } }],
      });
    } else if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      and.push({
        OR: [
          { venueName: { contains: query.search, mode: 'insensitive' } },
          { customer: { name: { contains: query.search, mode: 'insensitive' } } },
          { customer: { phone: { contains: query.search } } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          customer: { select: { id: true, name: true, phone: true } },
          assistant: { select: { id: true, name: true, phone: true } },
          payment: true,
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { items, total, page: query.page ?? 1, limit: take };
  }

  async getBooking(id: string) {
    if (this.useDev()) {
      const booking = this.dev.bookings.find((b) => b.id === id);
      if (!booking) throw new NotFoundException('Booking not found');
      return {
        ...booking,
        durationMin: 60,
        serviceFee: 300,
        platformFee: 30,
        addressFormatted: 'Phoenix Mall, Lower Parel, Mumbai',
        statusHistory: [{ status: booking.status, createdAt: booking.createdAt }],
      };
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        category: true,
        city: true,
        customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        assistant: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
            assistantProfile: true,
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payment: true,
        rating: true,
        appReview: true,
        rejections: {
          include: {
            assistant: { select: { id: true, name: true, phone: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async updateBookingStatus(id: string, dto: UpdateBookingStatusDto) {
    if (this.useDev()) {
      const booking = this.dev.bookings.find((b) => b.id === id);
      if (!booking) throw new NotFoundException('Booking not found');
      booking.status = dto.status as typeof booking.status;
      return this.getBooking(id);
    }

    const booking = await this.getBooking(id);
    if (booking.status === dto.status) return booking;

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: dto.status,
        statusHistory: {
          create: { status: dto.status, note: dto.note ?? 'Updated by admin' },
        },
      },
      include: {
        category: true,
        customer: { select: { id: true, name: true, phone: true } },
        assistant: { select: { id: true, name: true, phone: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payment: true,
      },
    });
  }

  async listCategories() {
    if (this.useDev()) return this.dev.categories;
    return this.prisma.serviceCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(dto: CreateCategoryDto) {
    if (this.useDev()) {
      const cat = { id: `c${Date.now()}`, ...dto, isActive: dto.isActive ?? true };
      this.dev.categories.push(cat as never);
      return cat;
    }
    return this.prisma.serviceCategory.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    if (this.useDev()) {
      const cat = this.dev.categories.find((c) => c.id === id);
      if (!cat) throw new NotFoundException('Category not found');
      Object.assign(cat, dto);
      return cat;
    }
    return this.prisma.serviceCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string) {
    if (this.useDev()) {
      const cat = this.dev.categories.find((c) => c.id === id);
      if (!cat) throw new NotFoundException('Category not found');
      cat.isActive = false;
      return cat;
    }
    return this.prisma.serviceCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async listCities() {
    if (this.useDev()) return this.dev.cities;
    return this.prisma.city.findMany({ orderBy: { name: 'asc' } });
  }

  async createCity(dto: CreateCityDto) {
    if (this.useDev()) {
      const city = { id: `city${Date.now()}`, ...dto, isActive: dto.isActive ?? true };
      this.dev.cities.push(city as never);
      return city;
    }
    return this.prisma.city.create({ data: dto });
  }

  async updateCity(id: string, dto: UpdateCityDto) {
    if (this.useDev()) {
      const city = this.dev.cities.find((c) => c.id === id);
      if (!city) throw new NotFoundException('City not found');
      Object.assign(city, dto);
      return city;
    }
    return this.prisma.city.update({ where: { id }, data: dto });
  }

  async listPayments(query: PaginationQueryDto) {
    if (this.useDev()) {
      return { items: this.dev.payments, total: this.dev.payments.length, page: 1, limit: 20 };
    }

    const { take, skip } = this.paginate(query.page, query.limit);
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            include: {
              customer: { select: { name: true, phone: true } },
              category: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.payment.count(),
    ]);
    return { items, total, page: query.page ?? 1, limit: take };
  }

  async listEarnings(query: PaginationQueryDto) {
    if (this.useDev()) {
      return { items: this.dev.earnings, total: this.dev.earnings.length, page: 1, limit: 20 };
    }

    const { take, skip } = this.paginate(query.page, query.limit);
    const [items, total] = await Promise.all([
      this.prisma.earning.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          assistant: { select: { id: true, name: true, phone: true } },
        },
      }),
      this.prisma.earning.count(),
    ]);
    return { items, total, page: query.page ?? 1, limit: take };
  }

  async markEarningPaidOut(id: string) {
    if (this.useDev()) {
      const e = this.dev.earnings.find((x) => x.id === id);
      if (!e) throw new NotFoundException('Earning not found');
      e.isPaidOut = true;
      return e;
    }

    const earning = await this.prisma.earning.findUnique({ where: { id } });
    if (!earning) throw new NotFoundException('Earning not found');
    return this.prisma.earning.update({
      where: { id },
      data: { isPaidOut: true },
    });
  }

  async listRatings(query: PaginationQueryDto) {
    if (this.useDev()) {
      return { items: this.dev.ratings, total: this.dev.ratings.length, page: 1, limit: 20 };
    }

    const { take, skip } = this.paginate(query.page, query.limit);
    const [items, total] = await Promise.all([
      this.prisma.rating.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          assistant: { select: { name: true, phone: true } },
          booking: { select: { venueName: true, category: { select: { name: true } } } },
        },
      }),
      this.prisma.rating.count(),
    ]);
    return { items, total, page: query.page ?? 1, limit: take };
  }

  async listAppReviews(query: PaginationQueryDto) {
    if (this.useDev()) {
      return { items: this.dev.appReviews, total: this.dev.appReviews.length, page: 1, limit: 20 };
    }

    const { take, skip } = this.paginate(query.page, query.limit);
    const [items, total] = await Promise.all([
      this.prisma.appReview.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, phone: true } },
        },
      }),
      this.prisma.appReview.count(),
    ]);
    return { items, total, page: query.page ?? 1, limit: take };
  }

  async listReferrals(query: PaginationQueryDto) {
    if (this.useDev()) {
      return { items: this.dev.referrals, total: this.dev.referrals.length, page: 1, limit: 20 };
    }

    const { take, skip } = this.paginate(query.page, query.limit);
    const [items, total] = await Promise.all([
      this.prisma.referral.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          referrer: { select: { name: true, phone: true, referralCode: true } },
          referee: { select: { name: true, phone: true } },
        },
      }),
      this.prisma.referral.count(),
    ]);
    return { items, total, page: query.page ?? 1, limit: take };
  }

  async getSettings() {
    return this.platformSettings.get();
  }

  async updateSettings(dto: UpdatePlatformSettingsDto) {
    const { id: _id, ...data } = dto as UpdatePlatformSettingsDto & { id?: string };
    return this.platformSettings.update(data);
  }

  async verifyAssistant(userId: string, adminId: string, dto: VerifyAssistantDto) {
    const profile = await this.prisma.assistantProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Assistant profile not found');

    return this.prisma.assistantProfile.update({
      where: { userId },
      data: {
        adminVerified: dto.verified,
        adminVerifiedAt: dto.verified ? new Date() : null,
        adminVerifiedBy: dto.verified ? adminId : null,
      },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
    });
  }

  async listRejections(query: PaginationQueryDto) {
    if (this.useDev()) {
      return { items: [], total: 0, page: query.page ?? 1, limit: 20 };
    }
    const { take, skip } = this.paginate(query.page, query.limit);
    const [items, total] = await Promise.all([
      this.prisma.bookingRejection.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              venueName: true,
              status: true,
              category: { select: { name: true } },
            },
          },
          assistant: {
            select: {
              id: true,
              name: true,
              phone: true,
              assistantProfile: { select: { assistantCode: true } },
            },
          },
        },
      }),
      this.prisma.bookingRejection.count(),
    ]);
    return { items, total, page: query.page ?? 1, limit: take };
  }

  async getDashboardAnalytics() {
    if (this.useDev()) {
      const daily: { date: string; bookings: number; revenue: number; completed: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        daily.push({
          date: d.toISOString().slice(0, 10),
          bookings: 1,
          revenue: 275,
          completed: 1,
        });
      }
      return { daily };
    }

    const days = 7;
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);

    const bookings = await this.prisma.booking.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true, status: true, totalAmount: true },
    });

    const daily: Record<string, { bookings: number; revenue: number; completed: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      daily[key] = { bookings: 0, revenue: 0, completed: 0 };
    }

    for (const b of bookings) {
      const key = b.createdAt.toISOString().slice(0, 10);
      if (!daily[key]) continue;
      daily[key].bookings += 1;
      if (b.status === BookingStatus.completed) {
        daily[key].completed += 1;
        daily[key].revenue += b.totalAmount;
      }
    }

    return {
      daily: Object.entries(daily).map(([date, stats]) => ({ date, ...stats })),
    };
  }

  async exportBookingsCsv() {
    const bookings = await this.prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: {
        customer: { select: { name: true, phone: true } },
        assistant: { select: { name: true, phone: true } },
        category: { select: { name: true } },
      },
    });

    const header =
      'id,status,customer,phone,assistant,category,venue,amount,scheduled_at,created_at\n';
    const rows = bookings.map((b) =>
      [
        b.id,
        b.status,
        b.customer.name ?? '',
        b.customer.phone,
        b.assistant?.name ?? '',
        b.category.name,
        b.venueName,
        b.totalAmount,
        b.scheduledAt.toISOString(),
        b.createdAt.toISOString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    return header + rows.join('\n');
  }

  async listPromos() {
    return this.promos.list();
  }

  async createPromo(adminId: string, dto: CreatePromoDto) {
    const promo = await this.promos.create(dto);
    await this.auditLog.log(adminId, 'create', 'promo_code', promo.id);
    return promo;
  }

  async togglePromo(adminId: string, id: string, isActive: boolean) {
    const promo = await this.promos.toggle(id, isActive);
    await this.auditLog.log(adminId, isActive ? 'activate' : 'deactivate', 'promo_code', id);
    return promo;
  }

  async listPayoutRequests(status?: string) {
    return this.payouts.listAll(status as never);
  }

  async processPayout(adminId: string, id: string, dto: ProcessPayoutDto) {
    const result = await this.payouts.process(id, dto.status as never, dto.adminNote);
    await this.auditLog.log(adminId, dto.status, 'payout_request', id, { adminNote: dto.adminNote });
    return result;
  }

  async listSupportTickets(status?: string) {
    return this.support.listAll(status as never);
  }

  async updateSupportTicket(adminId: string, id: string, dto: UpdateSupportTicketDto) {
    const ticket = await this.support.update(id, dto);
    await this.auditLog.log(adminId, 'update', 'support_ticket', id, dto as Record<string, unknown>);
    return ticket;
  }

  async listAuditLogs(query: PaginationQueryDto) {
    if (this.useDev()) {
      return { items: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20 };
    }
    return this.auditLog.list(query.page, query.limit);
  }

  async broadcastNotification(adminId: string, dto: AdminBroadcastNotificationDto) {
    const role =
      dto.audience === BroadcastAudience.customer ? UserRole.customer : UserRole.assistant;

    if (this.useDev()) {
      const targets = this.dev.users.filter((u) => u.roles.includes(role));
      const record = {
        id: `bc-${Date.now()}`,
        adminId,
        audience: dto.audience,
        title: dto.title,
        body: dto.body,
        sentCount: targets.length,
        failCount: 0,
        createdAt: new Date().toISOString(),
      };
      this.dev.broadcasts.unshift(record);
      return {
        broadcast: record,
        audience: dto.audience,
        targeted: targets.length,
        sent: targets.length,
        failed: 0,
      };
    }

    const users = await this.prisma.user.findMany({
      where: {
        isSuspended: false,
        roles: { has: role },
      },
      select: { id: true },
    });

    let sent = 0;
    let failed = 0;
    const batchSize = 30;
    const payload = {
      source: 'admin_broadcast',
      audience: dto.audience,
    };

    for (let i = 0; i < users.length; i += batchSize) {
      const chunk = users.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        chunk.map((u) =>
          this.notifications.create(u.id, {
            type: NotificationType.admin_broadcast,
            title: dto.title,
            body: dto.body,
            payload,
          }),
        ),
      );
      for (const r of results) {
        if (r.status === 'fulfilled') sent += 1;
        else failed += 1;
      }
    }

    const broadcast = await this.prisma.adminBroadcast.create({
      data: {
        adminId,
        audience: dto.audience,
        title: dto.title,
        body: dto.body,
        sentCount: sent,
        failCount: failed,
      },
    });

    await this.auditLog.log(adminId, 'broadcast', 'notification', broadcast.id, {
      audience: dto.audience,
      sent,
      failed,
      targeted: users.length,
    });

    return {
      broadcast,
      audience: dto.audience,
      targeted: users.length,
      sent,
      failed,
    };
  }

  async listNotificationBroadcasts(query: PaginationQueryDto) {
    if (this.useDev()) {
      const { take, skip } = this.paginate(query.page, query.limit);
      const items = this.dev.broadcasts.slice(skip, skip + take);
      return { items, total: this.dev.broadcasts.length, page: query.page ?? 1, limit: take };
    }

    const { take, skip } = this.paginate(query.page, query.limit);
    const [items, total] = await Promise.all([
      this.prisma.adminBroadcast.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminBroadcast.count(),
    ]);
    return { items, total, page: query.page ?? 1, limit: take };
  }
}
