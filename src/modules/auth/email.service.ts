import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private config: ConfigService) {}

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const subject = 'Your Liftoo verification code';
    const text = `Your Liftoo verification code is: ${otp}\n\nThis code expires in 5 minutes. Do not share it with anyone.`;
    const html = `
      <p>Your Liftoo verification code is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${otp}</p>
      <p>This code expires in 5 minutes. Do not share it with anyone.</p>
    `;

    const smtpHost = this.config.get<string>('SMTP_HOST');
    if (!smtpHost) {
      this.logger.log(`SMTP not configured — OTP for ${to}: ${otp}`);
      return;
    }

    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM') ?? this.config.get<string>('SMTP_USER'),
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`OTP email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error instanceof Error ? error.stack : error);
      throw new InternalServerErrorException('Failed to send verification email');
    }
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 465);

    if (!host || !user || !pass) {
      throw new InternalServerErrorException('SMTP is not fully configured');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    return this.transporter;
  }
}
