import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto, ResendOtpDto } from './dto/verify-otp.dto';
import { JwtUser } from './jwt/types';
import { Roles, RolesGuard } from './jwt/roles';
import {
  ApiCreateEndpoint,
  ApiPublicEndpoint,
  ApiProtectedEndpoint,
  ApiAdminEndpoint,
  ClientIp,
} from '../common/decorators';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiCreateEndpoint('Register a new supplier', 'User registered successfully')
  async register(@Body() dto: RegisterDto, @ClientIp() ip: string) {
    return this.authService.register(dto, ip);
  }

  @Post('register/admin')
  @ApiCreateEndpoint('Register a new admin (email and password only)', 'Admin registered successfully')
  async registerAdmin(@Body() dto: AdminRegisterDto, @ClientIp() ip: string) {
    return this.authService.registerAdmin(dto, ip);
  }

  @Post('login')
  @ApiPublicEndpoint('Login with email and password', 'Login successful')
  async login(@Body() dto: LoginDto, @ClientIp() ip: string) {
    return this.authService.login(dto, ip);
  }

  @Post('verify-otp')
  @ApiPublicEndpoint('Verify email with OTP', 'Email verified successfully')
  async verifyOtp(@Body() dto: VerifyOtpDto, @ClientIp() ip: string) {
    return this.authService.verifyOtp(dto, ip);
  }

  @Post('resend-otp')
  @ApiPublicEndpoint('Resend OTP to email', 'OTP sent successfully')
  async resendOtp(@Body() dto: ResendOtpDto, @ClientIp() ip: string) {
    return this.authService.resendOtp(dto, ip);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiProtectedEndpoint('Get current user profile', 'Returns user profile')
  async getProfile(@Request() req: { user: JwtUser }) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin-only')
  @ApiAdminEndpoint('Admin-only endpoint', 'Returns admin access confirmation')
  async adminOnly(@Request() req: { user: JwtUser }) {
    return {
      message: 'You have admin access',
      user: req.user,
    };
  }
}
