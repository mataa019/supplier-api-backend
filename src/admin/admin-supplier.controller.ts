import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles, RolesGuard } from '../Auth/jwt/roles';
import { ApiAdminEndpoint, ApiGetByIdEndpoint } from '../common/decorators';
import { AdminSupplierService } from './admin-supplier.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { UpdateSupplierStatusDto } from './dto/update-supplier-status.dto';

@ApiTags('Admin Suppliers')
@ApiBearerAuth('JWT-auth')
@Controller('admin/suppliers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminSupplierController {
  constructor(private adminSupplierService: AdminSupplierService) {}

  @Get('categories')
  @Roles('admin', 'manager')
  @ApiAdminEndpoint('List categories', 'Returns all categories')
  async listCategories() {
    return this.adminSupplierService.listCategories();
  }

  @Get('categories/:categoryId')
  @Roles('admin', 'manager')
  @ApiGetByIdEndpoint('Get category', 'Category details')
  async getCategory(@Param('categoryId') categoryId: string) {
    return this.adminSupplierService.getCategoryById(categoryId);
  }

  @Post('categories')
  @Roles('admin')
  @ApiAdminEndpoint('Create category', 'Category created')
  async createCategory(
    @Body() body: CreateCategoryDto,
  ) {
    return this.adminSupplierService.createCategory(body);
  }

  @Patch('categories/:categoryId')
  @Roles('admin')
  @ApiAdminEndpoint('Update category', 'Category updated')
  async updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.adminSupplierService.updateCategory(categoryId, body);
  }

  @Delete('categories/:categoryId')
  @Roles('admin')
  @ApiAdminEndpoint('Delete category', 'Category deleted')
  async deleteCategory(@Param('categoryId') categoryId: string) {
    return this.adminSupplierService.deleteCategory(categoryId);
  }

  @Post('categories/:categoryId/template')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiAdminEndpoint('Upload category template document', 'Template document uploaded and attached to category')
  async uploadCategoryTemplate(
    @Param('categoryId') categoryId: string,
    @UploadedFile() file: any,
  ) {
    return this.adminSupplierService.uploadCategoryTemplateDocument(categoryId, file);
  }

  @Delete('categories/:categoryId/template')
  @Roles('admin')
  @ApiAdminEndpoint('Remove category template document', 'Template document removed from category')
  async removeCategoryTemplate(@Param('categoryId') categoryId: string) {
    return this.adminSupplierService.removeCategoryTemplateDocument(categoryId);
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
  @ApiAdminEndpoint("Get supplier's applications", 'Returns applications for supplier')
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
