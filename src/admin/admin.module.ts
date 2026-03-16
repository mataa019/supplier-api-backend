import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminApplicationController } from './admin-application.controller';
import { AdminApplicationService } from './admin-application.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminSupplierController } from './admin-supplier.controller';
import { AdminSupplierService } from './admin-supplier.service';

@Module({
	imports: [AuditModule],
	controllers: [AdminController, AdminSupplierController, AdminApplicationController],
	providers: [AdminService, AdminSupplierService, AdminApplicationService, PrismaService],
	exports: [AdminService],
})
export class AdminModule {}
