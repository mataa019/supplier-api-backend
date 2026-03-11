import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend = new Resend(process.env.RESEND_EMAIL_API_KEY);

  async sendOtp(email: string, otp: string) {
    const result = await this.resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to: email,
      subject: 'OTP Verification',
      html: `<p>Your verification code is:</p>
             <h2>${otp}</h2>
             <p>This code expires in 5 minutes.</p>`,
    });
    console.log('Email sent:', result);
    return result;
  }
}