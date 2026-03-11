import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './Auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { MailService } from './mail/mail.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AuditModule,
  ],
  providers: [MailService],
})
export class AppModule {}
