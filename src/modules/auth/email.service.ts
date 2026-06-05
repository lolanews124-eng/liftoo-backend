import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private verified = false;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    if (!this.isConfigured()) return;
    try {
      await this.getTransporter().verify();
      this.verified = true;
      this.logger.log('SMTP connection verified');
    } catch (error) {
      this.logger.error(
        'SMTP verify failed — OTP emails may not deliver. Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  isConfigured(): boolean {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    return !!(host?.trim() && user?.trim() && pass?.trim());
  }

  async sendPasswordResetEmail(to: string, otp: string): Promise<void> {
    const subject = 'Reset your Liftoo password';
    const text = `Your Liftoo password reset code is: ${otp}\n\nThis code expires in 5 minutes. Do not share it with anyone.`;
    const html = `
      <p>Your Liftoo password reset code is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${otp}</p>
      <p>This code expires in 5 minutes. Do not share it with anyone.</p>
      <p style="color:#666;font-size:12px;">If you did not request this, ignore this email.</p>
    `;
    await this.sendMail(to, subject, text, html);
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const subject = 'Your Liftoo verification code';
    const text = `Your Liftoo verification code is: ${otp}\n\nThis code expires in 5 minutes. Do not share it with anyone.`;
    const html = `
      <p>Your Liftoo verification code is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${otp}</p>
      <p>This code expires in 5 minutes. Do not share it with anyone.</p>
      <p style="color:#666;font-size:12px;">If you did not request this, ignore this email.</p>
    `;

    await this.sendMail(to, subject, text, html);
  }

  private async sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
    if (!this.isConfigured()) {
      const isProd = this.config.get<string>('NODE_ENV') === 'production';
      this.logger.warn(`SMTP not configured — email for ${to}: ${text}`);
      if (isProd) {
        throw new InternalServerErrorException(
          'Email service is not configured on the server. Please contact support.',
        );
      }
      return;
    }

    try {
      const transporter = this.getTransporter();
      if (!this.verified) {
        await transporter.verify();
        this.verified = true;
      }
      await transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM') ?? this.config.get<string>('SMTP_USER'),
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error instanceof Error ? error.stack : error);
      throw new InternalServerErrorException(
        'Could not send email. Please try again in a few minutes or contact support.',
      );
    }
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST')!.trim();
    const user = this.config.get<string>('SMTP_USER')!.trim();
    const pass = this.config.get<string>('SMTP_PASS')!.trim();
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 465);
    const secure =
      this.config.get<string>('SMTP_SECURE') === 'true' ||
      (this.config.get<string>('SMTP_SECURE') !== 'false' && port === 465);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
      tls: { minVersion: 'TLSv1.2' },
    });

    return this.transporter;
  }
}
