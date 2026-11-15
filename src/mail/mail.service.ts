import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        html,
      });

      this.logger.log(`Лист успішно передано для ${to}`);
    } catch (e) {
      this.logger.error(
        `Не вдалося надіслати лист на ${to}`,
        e instanceof Error ? e.stack : String(e),
      );

      throw e;
    }
  }

  private frontend() {
    return process.env.FRONTEND_URL ?? 'http://localhost:5173';
  }

  sendVerification(to: string, token: string) {
    const link = `${this.frontend()}/verify-email?token=${encodeURIComponent(token)}`;

    return this.send(
      to,
      'Підтвердження пошти',
      `<p>Щоб підтвердити акаунт, перейдіть за <a href="${link}">посиланням</a>. Воно діє 24 години.</p>`,
    );
  }

  sendPasswordReset(to: string, token: string) {
    const link = `${this.frontend()}/reset-password?token=${encodeURIComponent(token)}`;

    return this.send(
      to,
      'Відновлення пароля',
      `<p>Щоб задати новий пароль, перейдіть за <a href="${link}">посиланням</a>. Воно діє 1 годину. Якщо це були не ви, проігноруйте лист.</p>`,
    );
  }
}
