import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '12345', description: '5-digit OTP code' })
  @IsString()
  @Length(5, 5)
  @Matches(/^\d{5}$/, { message: 'OTP must be exactly 5 digits' })
  otp: string;
}

export class ResendOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}
