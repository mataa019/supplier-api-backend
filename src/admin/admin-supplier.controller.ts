import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../Auth/jwt/roles';
import { ApiAdminEndpoint, ApiGetByIdEndpoint } from '../common/decorators';
import { AdminSupplierService } from './admin-supplier.service';
import { UpdateSupplierStatusDto } from './dto/update-supplier-status.dto';

@ApiTags('Admin Suppliers')
@ApiBearerAuth('JWT-auth')
@Controller('admin/suppliers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminSupplierController {
  constructor(private adminSupplierService: AdminSupplierService) {}

  @Get('form-templates')
  @Roles('admin', 'manager')
  @ApiAdminEndpoint('List available form templates', 'Returns active form templates')
  async listFormTemplates() {
    return this.adminSupplierService.listFormTemplates();
  }

  @Patch('categories/:categoryId/template')
  @Roles('admin')
  @ApiAdminEndpoint('Assign category form template', 'Category form template assigned')
  async assignCategoryTemplate(
    @Param('categoryId') categoryId: string,
    @Body() body: { templateId?: string },
  ) {
    if (!body?.templateId) {
      throw new BadRequestException('templateId is required');
    }

    return this.adminSupplierService.assignCategoryTemplate(
      categoryId,
      body.templateId,
    );
  }

  @Delete('categories/:categoryId/template')
  @Roles('admin')
  @ApiAdminEndpoint('Unassign category form template', 'Category form template unassigned')
  async unassignCategoryTemplate(@Param('categoryId') categoryId: string) {
    return this.adminSupplierService.unassignCategoryTemplate(categoryId);
  }

  @Get()
  @Roles('admin', 'manager')
  @ApiAdminEndpoint('List all suppliers', 'Returns suppliers list')
  async listAllSuppliers() {
    return this.adminSupplierService.listAllSuppliers();
  }

  @Get(':supplierId')
  @Roles('admin', 'manager')
  @ApiGetByIdEndpoint('Get single supplier', 'supplier')
  async getSupplierById(@Param('supplierId') supplierId: string) {
    return this.adminSupplierService.getSupplierById(supplierId);
  }

  @Get(':supplierId/applications')
  @Roles('admin', 'manager')
  @ApiAdminEndpoint(
    "Get supplier's applications",
    'Returns applications for supplier',
  )
  async getSupplierApplications(@Param('supplierId') supplierId: string) {
    return this.adminSupplierService.getSupplierApplications(supplierId);
  }

  @Get(':supplierId/payments')
  @Roles('admin', 'manager')
  @ApiAdminEndpoint('Get supplier payments', 'Returns payments for supplier')
  async getSupplierPayments(@Param('supplierId') supplierId: string) {
    return this.adminSupplierService.getSupplierPayments(supplierId);
  }

  @Patch(':supplierId/status')
  @Roles('admin')
  @ApiAdminEndpoint('Update supplier status', 'Supplier status updated')
  async updateSupplierStatus(
    @Param('supplierId') supplierId: string,
    @Body() dto: UpdateSupplierStatusDto,
  ) {
    return this.adminSupplierService.updateSupplierStatus(supplierId, dto);
  }

  @Delete(':supplierId')
  @Roles('admin')
  @ApiAdminEndpoint('Delete supplier', 'Supplier deleted')
  async deleteSupplier(@Param('supplierId') supplierId: string) {
    return this.adminSupplierService.deleteSupplier(supplierId);
  }
}
