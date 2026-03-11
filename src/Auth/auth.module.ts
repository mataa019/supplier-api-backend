import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt/jwt.strategy';
import { RolesGuard } from './jwt/roles';
import { PrismaService } from 'prisma/prisma.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        // set expiration to 15 minutes (900 seconds)
        signOptions: { expiresIn: 900 },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy, RolesGuard],
  exports: [AuthService],
})
export class AuthModule {}
