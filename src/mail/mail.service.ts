import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendOtp(email: string, otp: string) {
    await this.resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to: email,
      subject: 'OTP Verification',
      html: `<p>Your verification code is:</p>
             <h2>${otp}</h2>
             <p>This code expires in 5 minutes.</p>`,
    });
  }
}