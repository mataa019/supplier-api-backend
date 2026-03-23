import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: Transporter;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587);
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      throw new Error(
        'Missing SMTP configuration. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in environment variables.',
      );
    }

    this.fromEmail =
      this.configService.get<string>('MAIL_FROM') ??
      this.configService.get<string>('EMAIL_FROM') ??
      user;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendOtp(email: string, otp: string) {
    const result = await this.transporter.sendMail({
      from: this.fromEmail,
      to: email,
      subject: 'Minet Zambia Supplier OTP Verification',
      text: `Your verification code is: ${otp}. This code expires in 5 minutes.`,
      html: `<p>Your verification code is:</p>
             <h2>${otp}</h2>
             <p>This code expires in 5 minutes.</p>`,
    });

    console.log('Email sent:', result.messageId);
    return result;
  }
}