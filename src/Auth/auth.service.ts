import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt/types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user and supplier in a transaction
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role: dto.role || 'supplier',
        status: 'active',
        supplier: {
          create: {
            companyName: dto.companyName,
            registrationNumber: dto.registrationNumber,
            tpin: dto.tpin,
            phone: dto.phone,
            email: dto.email,
            contactPerson: dto.companyName,
            address: '',
          },
        },
      },
      include: {
        supplier: true,
      },
    });

    // Generate token
    const token = this.generateToken(user.id, user.email, user.role);

    // Audit: registration
    await this.auditService.log({
      userId: user.id,
      action: 'REGISTER',
      entity: 'User',
      entityId: user.id,
      details: JSON.stringify({ email: user.email, role: user.role }),
    });

    return {
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        supplier: user.supplier,
      },
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { supplier: true },
    });

    if (!user) {
      // Audit: failed login (unknown email)
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        entity: 'User',
        details: JSON.stringify({ email: dto.email, reason: 'User not found' }),
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      // Audit: failed login (wrong password)
      await this.auditService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({ email: dto.email, reason: 'Invalid password' }),
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'active') {
      // Audit: failed login (inactive account)
      await this.auditService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({ email: dto.email, reason: 'Account inactive' }),
      });
      throw new UnauthorizedException('Account is inactive');
    }

    // Generate token
    const token = this.generateToken(user.id, user.email, user.role);

    // Audit: successful login
    await this.auditService.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      details: JSON.stringify({ email: user.email, role: user.role }),
    });

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        supplier: user.supplier,
      },
      accessToken: token,
    };
  }

  private generateToken(userId: string, email: string, role: string): string {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    return this.jwtService.sign(payload);
  }
}

