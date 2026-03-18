import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
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
  @Roles('admin', 'manager')
  @ApiAdminEndpoint('Create category', 'Category created')
  async createCategory(
    @Req() req: any,
    @Body() body: CreateCategoryDto,
  ) {
    return this.adminSupplierService.createCategory(body, req.user.id);
  }

  @Patch('categories/:categoryId')
  @Roles('admin', 'manager')
  @ApiAdminEndpoint('Update category', 'Category updated')
  async updateCategory(
    @Req() req: any,
    @Param('categoryId') categoryId: string,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.adminSupplierService.updateCategory(categoryId, body, req.user.id);
  }

  @Delete('categories/:categoryId')
  @Roles('admin')
  @ApiAdminEndpoint('Delete category', 'Category deleted')
  async deleteCategory(
    @Req() req: any,
    @Param('categoryId') categoryId: string,
  ) {
    return this.adminSupplierService.deleteCategory(categoryId, req.user.id);
  }

  @Post('categories/:categoryId/template')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiAdminEndpoint('Upload category template document', 'Template document uploaded and attached to category')
  async uploadCategoryTemplate(
    @Req() req: any,
    @Param('categoryId') categoryId: string,
    @UploadedFile() file: any,
  ) {
    return this.adminSupplierService.uploadCategoryTemplateDocument(
      categoryId,
      file,
      req.user.id,
    );
  }

  @Delete('categories/:categoryId/template')
  @Roles('admin')
  @ApiAdminEndpoint('Remove category template document', 'Template document removed from category')
  async removeCategoryTemplate(
    @Req() req: any,
    @Param('categoryId') categoryId: string,
  ) {
    return this.adminSupplierService.removeCategoryTemplateDocument(categoryId, req.user.id);
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
    @Req() req: any,
    @Param('supplierId') supplierId: string,
    @Body() dto: UpdateSupplierStatusDto,
  ) {
    return this.adminSupplierService.updateSupplierStatus(supplierId, dto, req.user.id);
  }

  @Delete(':supplierId')
  @Roles('admin')
  @ApiAdminEndpoint('Delete supplier', 'Supplier deleted')
  async deleteSupplier(
    @Req() req: any,
    @Param('supplierId') supplierId: string,
  ) {
    return this.adminSupplierService.deleteSupplier(supplierId, req.user.id);
  }
}
