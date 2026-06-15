import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { AppConfig } from '../../config/configuration';

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

/**
 * Outbound email. Best-effort and optional: if SMTP isn't configured the service
 * stays disabled and callers fall back to showing the password in the console.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private from = '';

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  onModuleInit(): void {
    const mail = this.config.get('mail', { infer: true });
    this.from = mail.from;
    if (!mail.host || !mail.user || !mail.pass) {
      this.logger.warn('SMTP not configured (SMTP_HOST/USER/PASS) — outbound email is disabled.');
      return;
    }
    this.transporter = createTransport({
      host: mail.host,
      port: mail.port,
      secure: mail.secure,
      auth: { user: mail.user, pass: mail.pass },
    });
    this.logger.log(`SMTP configured (${mail.host}:${mail.port}).`);
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  private async send(to: string, subject: string, text: string, html: string): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text, html });
      return true;
    } catch (e) {
      this.logger.error(`Failed to email ${to}: ${(e as Error).message}`);
      return false;
    }
  }

  /** Email a freshly-onboarded owner their login credentials. Returns whether sent. */
  sendOwnerWelcome(to: string, name: string, password: string): Promise<boolean> {
    const subject = 'Your Wheat Harvester account is ready';
    const text =
      `Hi ${name},\n\n` +
      `Your Wheat Harvester account has been created.\n\n` +
      `Login (email): ${to}\n` +
      `Password: ${password}\n\n` +
      `Open the app and sign in, then change your password from Settings.\n`;
    const html =
      `<p>Hi ${escapeHtml(name)},</p>` +
      `<p>Your Wheat Harvester account has been created.</p>` +
      `<p><b>Login (email):</b> ${escapeHtml(to)}<br/>` +
      `<b>Password:</b> <code>${escapeHtml(password)}</code></p>` +
      `<p>Open the app and sign in, then change your password from Settings.</p>`;
    return this.send(to, subject, text, html);
  }
}
