import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Push notification integration point.
 * Wire FCM/APNs here when provider credentials are available.
 */
@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(private config: ConfigService) {}

  isEnabled() {
    return this.config.get('FCM_SERVER_KEY') != null;
  }

  async sendToToken(
    fcmToken: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ) {
    if (!this.isEnabled()) {
      this.logger.debug(`Push skipped (FCM not configured): ${payload.title}`);
      return { sent: false, reason: 'FCM not configured' };
    }

    // TODO: call FCM HTTP v1 when FCM_SERVER_KEY / service account is provided.
    this.logger.log(`Push queued for token …${fcmToken.slice(-6)}: ${payload.title}`);
    return { sent: true, queued: true };
  }
}
