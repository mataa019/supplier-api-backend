import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminSupplierController } from './admin-supplier.controller';
import { AdminSupplierService } from './admin-supplier.service';

@Module({
	controllers: [AdminController, AdminSupplierController],
	providers: [AdminService, AdminSupplierService, PrismaService],
	exports: [AdminService],
})
export class AdminModule {}
