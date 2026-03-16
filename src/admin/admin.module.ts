import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminApplicationController, AdminSupplierController } from './admin-supplier.controller';
import { AdminSupplierService } from './admin-supplier.service';

@Module({
	imports: [AuditModule],
	controllers: [AdminController, AdminSupplierController, AdminApplicationController],
	providers: [AdminService, AdminSupplierService, PrismaService],
	exports: [AdminService],
})
export class AdminModule {}
