import { Module } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SupplierApplicationController, SupplierController } from './supplier.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [SupplierService, PrismaService],
  controllers: [SupplierController, SupplierApplicationController],
  exports: [SupplierService],
})
export class SupplierModule {}
