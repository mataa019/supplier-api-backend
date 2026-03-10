import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Roles, RolesGuard } from './jwt/roles';
import { JwtUser } from './jwt/types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req: { user: JwtUser }) {
    return req.user;
  }

  // admin-only endpoint
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin-only')
  async adminOnly(@Request() req: { user: JwtUser }) {
    return {
      message: 'You have admin access',
      user: req.user,
    };
  }

  // manager-only endpoint
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('manager')
  @Get('manager-only')
  async managerOnly(@Request() req: { user: JwtUser }) {
    return {
      message: 'You have manager access',
      user: req.user,
    };
  }
}
