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
import { JwtUser } from './jwt/types';
import { Roles, RolesGuard } from './jwt/roles';
import {
  ApiCreateEndpoint,
  ApiPublicEndpoint,
  ApiProtectedEndpoint,
  ApiAdminEndpoint,
} from '../common/decorators';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiCreateEndpoint('Register a new supplier', 'User registered successfully')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('register/admin')
  @ApiCreateEndpoint('Register a new admin (email and password only)', 'Admin registered successfully')
  async registerAdmin(@Body() dto: AdminRegisterDto) {
    return this.authService.registerAdmin(dto);
  }

  @Post('login')
  @ApiPublicEndpoint('Login with email and password', 'Login successful')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiProtectedEndpoint('Get current user profile', 'Returns user profile')
  async getProfile(@Request() req: { user: JwtUser }) {
    return req.user;
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
