import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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

  @Get('categories')
  @Roles('admin', 'manager')
  @ApiAdminEndpoint('List categories', 'Returns all categories with assigned templates')
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
    @Body()
    body: {
      name?: string;
      description?: string;
      applicationFee?: number;
      status?: 'active' | 'inactive';
      templateId?: string;
      documentTemplate?: string;
    },
  ) {
    return this.adminSupplierService.createCategory(body);
  }

  @Patch('categories/:categoryId')
  @Roles('admin')
  @ApiAdminEndpoint('Update category', 'Category updated')
  async updateCategory(
    @Param('categoryId') categoryId: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      applicationFee?: number;
      status?: 'active' | 'inactive';
      templateId?: string | null;
      documentTemplate?: string | null;
    },
  ) {
    return this.adminSupplierService.updateCategory(categoryId, body);
  }

  @Delete('categories/:categoryId')
  @Roles('admin')
  @ApiAdminEndpoint('Delete category', 'Category deleted')
  async deleteCategory(@Param('categoryId') categoryId: string) {
    return this.adminSupplierService.deleteCategory(categoryId);
  }

  @Post('form-templates')
  @Roles('admin')
  @ApiAdminEndpoint(
    'Create form template',
    'Creates a form template and optionally assigns it to a category',
  )
  async createFormTemplate(
    @Body()
    body: {
      name?: string;
      version?: string;
      description?: string;
      categoryId?: string;
      fields?: Array<{
        key: string;
        label: string;
        type:
          | 'text'
          | 'textarea'
          | 'number'
          | 'email'
          | 'phone'
          | 'date'
          | 'select'
          | 'radio'
          | 'checkbox'
          | 'boolean';
        required?: boolean;
        placeholder?: string;
        helpText?: string;
        options?: string[];
      }>;
    },
  ) {
    return this.adminSupplierService.createFormTemplate(body);
  }

  @Get('form-templates/library')
  @Roles('admin', 'manager')
  @ApiAdminEndpoint(
    'List template library',
    'Returns reusable template schemas from code file',
  )
  async listTemplateLibrary() {
    return this.adminSupplierService.listTemplateLibrary();
  }

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
