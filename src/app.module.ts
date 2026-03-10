import { Module } from '@nestjs/common';
import { AuthModule } from './Auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
})
export class AppModule {}
