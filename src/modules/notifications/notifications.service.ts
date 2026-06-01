import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PushNotificationService } from './push-notification.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeGateway))
    private realtime: RealtimeGateway,
    private push: PushNotificationService,
  ) {}

  async create(
    userId: string,
    data: {
      type: NotificationType;
      title: string;
      body: string;
      payload?: Record<string, unknown>;
    },
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        body: data.body,
        payload: (data.payload ?? {}) as object,
      },
    });

    this.realtime.emitToUser(userId, 'notification:new', notification);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    if (user?.fcmToken) {
      await this.push.sendToToken(user.fcmToken, {
        title: data.title,
        body: data.body,
        data: Object.fromEntries(
          Object.entries(data.payload ?? {}).map(([k, v]) => [k, String(v)]),
        ),
      });
    }

    return notification;
  }

  async list(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
