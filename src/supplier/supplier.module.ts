import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SupplierApplicationController } from './application.controller';
import { SupplierApplicationService } from './application.service';
import { SupplierService } from './supplier.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SupplierController } from './supplier.controller';
import { DocumentController } from './document.controller';

@Module({
  imports: [AuditModule],
  providers: [SupplierService, SupplierApplicationService, PrismaService],
  controllers: [SupplierController, SupplierApplicationController, DocumentController],
  exports: [SupplierService],
})
export class SupplierModule {}
