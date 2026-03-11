import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;
  private emailFrom: string;

  constructor(private configService: ConfigService) {
  this.resend = new Resend(this.configService.get<string>('RESEND_EMAIL_API_KEY')!);
  this.emailFrom = this.configService.get<string>('EMAIL_FROM')!;
}

  async sendOtp(email: string, otp: string) {
    const result = await this.resend.emails.send({
      from: this.emailFrom,
      to: email,
      subject: 'Minet Zambia Supplier OTP Verification ',
      html: `<p>Your verification code is:</p>
             <h2>${otp}</h2>
             <p>This code expires in 5 minutes.</p>`,
    });
    console.log('Email sent:', result);
    return result;
  }
}