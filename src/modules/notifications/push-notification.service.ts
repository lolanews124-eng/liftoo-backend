import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private messaging: admin.messaging.Messaging | null = null;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const credPath = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    if (!credPath) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT_PATH not set — push notifications disabled');
      return;
    }

    try {
      const absolute = resolve(credPath);
      const serviceAccount = JSON.parse(readFileSync(absolute, 'utf8')) as admin.ServiceAccount;
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }
      this.messaging = admin.messaging();
      this.logger.log('FCM push enabled');
    } catch (e) {
      this.logger.error(`FCM init failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  isEnabled() {
    return this.messaging != null;
  }

  async sendToToken(
    fcmToken: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ) {
    if (!this.messaging) {
      this.logger.debug(`Push skipped (FCM not configured): ${payload.title}`);
      return { sent: false, reason: 'FCM not configured' };
    }

    try {
      await this.messaging.send({
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: { channelId: 'liftoo_default' },
        },
      });
      return { sent: true };
    } catch (e) {
      this.logger.warn(`FCM send failed: ${e instanceof Error ? e.message : e}`);
      return { sent: false, reason: 'send_failed' };
    }
  }
}
