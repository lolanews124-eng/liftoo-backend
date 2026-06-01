import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod } from '@prisma/client';

export interface GatewayPaymentRequest {
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  customerId: string;
}

export interface GatewayPaymentResult {
  success: boolean;
  providerRef?: string;
  message?: string;
}

/**
 * Payment gateway integration point (Razorpay, PhonePe, etc.).
 * Currently records intent only — wire provider SDK when keys are supplied.
 */
@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(private config: ConfigService) {}

  isGatewayMethod(method: PaymentMethod) {
    return method === PaymentMethod.gateway || method === PaymentMethod.upi;
  }

  isConfigured() {
    return Boolean(this.config.get('PAYMENT_GATEWAY_KEY'));
  }

  async initiatePayment(req: GatewayPaymentRequest): Promise<GatewayPaymentResult> {
    if (!this.isGatewayMethod(req.method)) {
      return { success: true, message: 'Non-gateway method — no provider call needed' };
    }

    if (!this.isConfigured()) {
      this.logger.debug(
        `Gateway payment skipped (PAYMENT_GATEWAY_KEY not set) booking=${req.bookingId}`,
      );
      return {
        success: true,
        message: 'Gateway not configured — payment recorded locally until provider is wired',
      };
    }

    // TODO: create Razorpay order / PhonePe intent when PAYMENT_GATEWAY_KEY is provided.
    this.logger.log(`Gateway payment queued booking=${req.bookingId} amount=${req.amount}`);
    return { success: true, providerRef: `pending-${req.bookingId.slice(0, 8)}`, message: 'Queued for gateway' };
  }
}
