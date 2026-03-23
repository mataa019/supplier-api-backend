import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/audit.types';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto, ResendOtpDto } from './dto/verify-otp.dto';
import { JwtPayload } from './jwt/types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
    private mailService: MailService,
  ) {}

  private generateOtp(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  private getOtpExpiry(): Date {
    return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  }

  async register(dto: RegisterDto, ipAddress?: string) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const existingSupplierIdentity = await this.prisma.supplier.findFirst({
      where: {
        OR: [
          { registrationNumber: dto.registrationNumber },
          { tpin: dto.tpin },
        ],
      },
      select: {
        registrationNumber: true,
        tpin: true,
      },
    });

    if (existingSupplierIdentity?.registrationNumber === dto.registrationNumber) {
      throw new ConflictException('Registration number already registered');
    }

    if (existingSupplierIdentity?.tpin === dto.tpin) {
      throw new ConflictException('TPIN already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user and supplier in a transaction
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role: 'supplier',
        status: 'inactive',
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

    // Generate and store OTP
    const otp = this.generateOtp();
    await this.prisma.otp.create({
      data: {
        userId: user.id,
        code: otp,
        type: 'email_verification',
        expiresAt: this.getOtpExpiry(),
      },
    });

    // Send OTP email
    await this.mailService.sendOtp(user.email, otp);

    // Audit: registration
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.REGISTER,
      entity: AuditEntity.USER,
      entityId: user.id,
      details: {
        email: user.email,
        role: user.role,
        createdByRole: user.role,
        createdByEmail: user.email,
      },
      ipAddress,
    });

    return {
      message: 'Registration successful. Please verify your email with the OTP sent.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        supplier: user.supplier,
      },
    };
  }


  async registerAdmin(dto: AdminRegisterDto, ipAddress?: string) {
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
        status: 'inactive',
      },
    });

    const otp = this.generateOtp();
    await this.prisma.otp.create({
      data: {
        userId: user.id,
        code: otp,
        type: 'email_verification',
        expiresAt: this.getOtpExpiry(),
      },
    });

    await this.mailService.sendOtp(user.email, otp);

    // Audit: admin registration
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.REGISTER,
      entity: AuditEntity.USER,
      entityId: user.id,
      details: {
        email: user.email,
        role: user.role,
        createdByRole: user.role,
        createdByEmail: user.email,
      },
      ipAddress,
    });

    return {
      message: 'Admin registration successful. Please verify your email with the OTP sent.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(dto: LoginDto, ipAddress?: string) {
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
        details: {
          email: dto.email,
          reason,
          createdByRole: user?.role ?? null,
          createdByEmail: dto.email,
        },
        ipAddress,
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

    if (!user.emailVerified) {
      return failLogin('Email not verified', 'Please verify your email with OTP before logging in');
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
      details: {
        email: user.email,
        role: user.role,
        createdByRole: user.role,
        createdByEmail: user.email,
      },
      ipAddress,
    });

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        role: user.role,
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

  async verifyOtp(dto: VerifyOtpDto, ipAddress?: string) {
    const otpRecord = await this.prisma.otp.findFirst({
      where: {
        code: dto.otp,
        type: 'email_verification',
        used: false,
        expiresAt: { gte: new Date() },
      },
      include: {
        user: {
          include: {
            supplier: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      await this.auditService.log({
        action: AuditAction.LOGIN_FAILED,
        entity: AuditEntity.USER,
        details: {
          reason: 'Invalid or expired OTP',
          createdByRole: null,
          createdByEmail: null,
        },
        ipAddress,
      });
      throw new BadRequestException('Invalid or expired OTP');
    }

    const user = otpRecord.user;

    if (user.emailVerified) {
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        entity: AuditEntity.USER,
        entityId: user.id,
        details: {
          reason: 'Email already verified',
          createdByRole: user.role,
          createdByEmail: user.email,
        },
        ipAddress,
      });
      throw new BadRequestException('Email already verified');
    }

    // Mark OTP as used and verify email
    await this.prisma.$transaction([
      this.prisma.otp.update({
        where: { id: otpRecord.id },
        data: { used: true },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, status: 'active' },
      }),
    ]);

    // Generate token after successful verification
    const token = this.generateToken(user.id, user.email, user.role);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      entity: AuditEntity.USER,
      entityId: user.id,
      details: {
        email: user.email,
        action: 'email_verified',
        createdByRole: user.role,
        createdByEmail: user.email,
      },
      ipAddress,
    });

    return {
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        supplier: user.supplier,
      },
      accessToken: token,
    };
  }

  async resendOtp(dto: ResendOtpDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Invalidate previous OTPs
    await this.prisma.otp.updateMany({
      where: {
        userId: user.id,
        type: 'email_verification',
        used: false,
      },
      data: { used: true },
    });

    // Generate new OTP
    const otp = this.generateOtp();
    await this.prisma.otp.create({
      data: {
        userId: user.id,
        code: otp,
        type: 'email_verification',
        expiresAt: this.getOtpExpiry(),
      },
    });

    // Send OTP email
    await this.mailService.sendOtp(user.email, otp);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.REGISTER,
      entity: AuditEntity.USER,
      entityId: user.id,
      details: {
        action: 'otp_resent',
        createdByRole: user.role,
        createdByEmail: user.email,
      },
      ipAddress,
    });

    return {
      message: 'OTP sent successfully',
    };
  }
}

