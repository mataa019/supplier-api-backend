import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/audit.types';
import { RegisterDto } from './dto/register.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
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
      action: AuditAction.REGISTER,
      entity: AuditEntity.USER,
      entityId: user.id,
      details: { email: user.email, role: user.role },
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

  async registerAdmin(dto: AdminRegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create admin user (no supplier relation)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role: 'admin',
        status: 'active',
      },
    });

    // Generate token
    const token = this.generateToken(user.id, user.email, user.role);

    // Audit: admin registration
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.REGISTER,
      entity: AuditEntity.USER,
      entityId: user.id,
      details: { email: user.email, role: user.role },
    });

    return {
      message: 'Admin registration successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
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

    // Helper to log failed login and throw
    const failLogin = async (reason: string, message = 'Invalid credentials'): Promise<never> => {
      await this.auditService.log({
        userId: user?.id,
        action: AuditAction.LOGIN_FAILED,
        entity: AuditEntity.USER,
        entityId: user?.id,
        details: { email: dto.email, reason },
      });
      throw new UnauthorizedException(message);
    };

    if (!user) {
      return failLogin('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      return failLogin('Invalid password');
    }

    // Check if user is active
    if (user.status !== 'active') {
      return failLogin('Account inactive', 'Account is inactive');
    }
    // Generate token
    const token = this.generateToken(user.id, user.email, user.role);

    // Audit: successful login
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      entity: AuditEntity.USER,
      entityId: user.id,
      details: { email: user.email, role: user.role },
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

