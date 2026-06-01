import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {}

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const subject = 'Your Liftoo verification code';
    const body = `Your Liftoo verification code is: ${otp}\n\nThis code expires in 5 minutes. Do not share it with anyone.`;

    const smtpHost = this.config.get<string>('SMTP_HOST');
    if (smtpHost) {
      // Wire nodemailer or your SMTP provider when credentials are configured.
      this.logger.warn(`SMTP_HOST set but mailer not wired — OTP for ${to}: ${otp}`);
      return;
    }

    this.logger.log(`OTP email to ${to}: ${otp}`);
  }
}
