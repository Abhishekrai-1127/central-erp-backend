import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure transport options via environment variables or default to standard test/SMTP options
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    this.logger.log(`[sendEmail] Sending email to: ${to} with subject: "${subject}"`);
    try {
      if (process.env.NODE_ENV === 'test' || !process.env.SMTP_HOST) {
        this.logger.log(`[sendEmail] Mocking email send in non-production/unconfigured environment.`);
        return;
      }

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"ERP System" <noreply@erp.com>',
        to,
        subject,
        html,
      });
      this.logger.log(`[sendEmail] Email successfully sent to: ${to}`);
    } catch (error: any) {
      this.logger.error(`[sendEmail] Failed to send email to ${to}: ${error.message}`, error.stack);
      // Not throwing error to match user's non-blocking logging behavior if needed
    }
  }
}

// Standalone function matching `sendEmail(to, subject, html)`
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const service = new EmailService();
  return service.sendEmail(to, subject, html);
}
