import { Module } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { SupplierApplicationController } from './application.controller';
import { SupplierApplicationService } from './application.service';

@Module({
  imports: [AuditModule],
  providers: [SupplierService, SupplierApplicationService, PrismaService],
  controllers: [SupplierController, SupplierApplicationController],
  exports: [SupplierService],
})
export class SupplierModule {}
