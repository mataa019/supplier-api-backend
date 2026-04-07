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
    console.log('Register Request:', dto);
    try {
      const result = await this.authService.register(dto, ip);
      console.log('Registration Success:', result);
      return result;
    } catch (error) {
      console.error('Registration Failed');
      throw error;
    }
  }


  @Post('register/admin')
  @ApiCreateEndpoint('Register a new admin (email and password only)', 'Admin registered successfully')
  async registerAdmin(@Body() dto: AdminRegisterDto, @ClientIp() ip: string) {
    console.log('Register Admin Request:', dto);
    try {
      const result = await this.authService.registerAdmin(dto, ip);
      console.log('Register Admin Success:', result);
      return result;
    } catch (error) {
      console.error('Register Admin Failed');
      throw error;
    }
  }


  @Post('login')
  @ApiPublicEndpoint('Login with email and password', 'Login successful')
  async login(@Body() dto: LoginDto, @ClientIp() ip: string) {
    console.log('Login Request:', dto);
    try {
      const result = await this.authService.login(dto, ip);
      console.log('Login Success:', result);
      return result;
    } catch (error) {
      console.error('Login Failed');
      throw error;
    }
  }


  @Post('verify-otp')
  @ApiPublicEndpoint('Verify email with OTP', 'Email verified successfully')
  async verifyOtp(@Body() dto: VerifyOtpDto, @ClientIp() ip: string) {
    console.log('Verify OTP Request:', dto);
    try {
      const result = await this.authService.verifyOtp(dto, ip);
      console.log('Verify OTP Success:', result);
      return result;
    } catch (error) {
      console.error('Verify OTP Failed');
      throw error;
    }
  }


  @Post('resend-otp')
  @ApiPublicEndpoint('Resend OTP to email', 'OTP sent successfully')
  async resendOtp(@Body() dto: ResendOtpDto, @ClientIp() ip: string) {
    console.log('Resend OTP Request:', dto);
    try {
      const result = await this.authService.resendOtp(dto, ip);
      console.log('Resend OTP Success:', result);
      return result;
    } catch (error) {
      console.error('Resend OTP Failed');
      throw error;
    }
  }


  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiProtectedEndpoint('Get current user profile', 'Returns user profile')
  async getProfile(@Request() req: { user: JwtUser }) {
    console.log('Get Profile Request:', req.user);
    try {
      const result = await this.authService.getProfile(req.user.id);
      console.log('Get Profile Success:', result);
      return result;
    } catch (error) {
      console.error('Get Profile Failed');
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin-only')
  @ApiAdminEndpoint('Admin-only endpoint', 'Returns admin access confirmation')
  async adminOnly(@Request() req: { user: JwtUser }) {
    console.log('Admin-only Request:', req.user);
    try {
      const result = {
        message: 'You have admin access',
        user: req.user,
      };
      console.log('Admin-only endpoint success:', result);
      return result;
    } catch (error) {
      console.error('Admin-only endpoint failed');
      throw error;
    }
  }
}
