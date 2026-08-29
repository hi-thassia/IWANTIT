import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

export interface PasswordResetMailer {
  sendPasswordReset(input: { email: string; name: string; resetUrl: string }): Promise<void>;
}

export class SmtpPasswordResetMailer implements PasswordResetMailer {
  private readonly transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });

  async sendPasswordReset({ email, name, resetUrl }: { email: string; name: string; resetUrl: string }) {
    await this.transport.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: 'Redefina sua senha — I Want It',
      text: `Olá, ${name}. Use este link para redefinir sua senha: ${resetUrl}\n\nSe você não solicitou a alteração, ignore esta mensagem.`,
      html: `<p>Olá, ${escapeHtml(name)}.</p><p><a href="${escapeHtml(resetUrl)}">Redefina sua senha</a>.</p><p>Se você não solicitou a alteração, ignore esta mensagem.</p>`,
    });
  }
}

export class DevelopmentPasswordResetMailer implements PasswordResetMailer {
  async sendPasswordReset({ email, resetUrl }: { email: string; name: string; resetUrl: string }) {
    process.stdout.write(`[development] Password reset for ${email}: ${resetUrl}\n`);
  }
}

export class UnavailablePasswordResetMailer implements PasswordResetMailer {
  async sendPasswordReset() { throw new Error('Password reset e-mail is unavailable because SMTP is not configured'); }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
}

export function createPasswordResetMailer(): PasswordResetMailer {
  if (env.NODE_ENV === 'production') {
    return env.SMTP_HOST ? new SmtpPasswordResetMailer() : new UnavailablePasswordResetMailer();
  }
  return new DevelopmentPasswordResetMailer();
}
