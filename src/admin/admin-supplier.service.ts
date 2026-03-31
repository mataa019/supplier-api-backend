import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryStatus } from '@prisma/client';
import { access, mkdir, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { extname, isAbsolute, join, relative } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/audit.types';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { UpdateSupplierStatusDto } from './dto/update-supplier-status.dto';

@Injectable()
export class AdminSupplierService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        applicationFee: true,
        status: true,
        documentTemplate: true,
        createdAt: true,
      },
    });
  }

  async getCategoryById(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        applicationFee: true,
        status: true,
        documentTemplate: true,
        createdAt: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async createCategory(
    dto: CreateCategoryDto,
    userId: string,
    userRole?: string,
    userEmail?: string,
    file?: any,
  ) {
    if (!dto?.name?.trim()) {
      throw new BadRequestException('name is required');
    }

    if (typeof dto.applicationFee !== 'number' || Number.isNaN(dto.applicationFee)) {
      throw new BadRequestException('application Fee must be a valid number');
    }

    if (dto.applicationFee < 0) {
      throw new BadRequestException('application Fee cannot be negative');
    }

    if (typeof dto.requirements !== 'string' || !dto.requirements.trim()) {
      throw new BadRequestException('requirements should not be empty');
    }

    const created = await this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        applicationFee: dto.applicationFee,
        status: dto.status ? (dto.status as CategoryStatus) : undefined,
        documentTemplate: null,
        Requirements: dto.requirements.trim(),
      },
    });

    // If file is provided, upload and update documentTemplate
    if (file) {
      const uploadResult = await this.uploadCategoryTemplateDocument(
        created.id,
        file,
        userId,
        userRole,
        userEmail,
      );
      created.documentTemplate = uploadResult.category.documentTemplate;
    }

    await this.auditService.log({
      userId,
      action: AuditAction.CREATE_CATEGORY,
      entity: AuditEntity.CATEGORY,
      entityId: created.id,
      details: {
        name: created.name,
        status: created.status,
        applicationFee: created.applicationFee,
        createdByRole: userRole,
        createdByEmail: userEmail,
      },
    });

    return created;
}
  async updateCategory(
    categoryId: string,
    dto: UpdateCategoryDto,
    userId: string,
    userRole?: string,
    userEmail?: string,
    file?: any,
  ) {
    await this.ensureCategoryExists(categoryId);

    if (
      typeof dto.applicationFee === 'number' &&
      (Number.isNaN(dto.applicationFee) || dto.applicationFee < 0)
    ) {
      throw new BadRequestException('applicationFee must be a non-negative number');
    }

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: dto.name?.trim(),
        description:
          dto.description === undefined
            ? undefined
            : (dto.description?.trim() || null),
        applicationFee: dto.applicationFee,
        status: dto.status ? (dto.status as CategoryStatus) : undefined,
        Requirements: dto.requirements?.trim(),
      },
    });

    // If file is provided, upload and update documentTemplate
    let finalUpdated = updated;
    if (file) {
      const uploadResult = await this.uploadCategoryTemplateDocument(
        categoryId,
        file,
        userId,
        userRole,
        userEmail,
      );
      finalUpdated = { ...updated, documentTemplate: uploadResult.category.documentTemplate };
    }

    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE_CATEGORY,
      entity: AuditEntity.CATEGORY,
      entityId: finalUpdated.id,
      details: {
        name: finalUpdated.name,
        status: finalUpdated.status,
        applicationFee: finalUpdated.applicationFee,
        createdByRole: userRole,
        createdByEmail: userEmail,
      },
    });

    return finalUpdated;
  }

  async deleteCategory(
    categoryId: string,
    userId: string,
    userRole?: string,
    userEmail?: string,
  ) {
    const category = await this.ensureCategoryExists(categoryId);

    const applicationCount = await this.prisma.application.count({
      where: { categoryId },
    });

    if (applicationCount > 0) {
      throw new ConflictException(
        'Cannot delete category with existing applications',
      );
    }

    // Remove template document (if any) and handle audit logging
    if (category.documentTemplate) {
      await this.removeCategoryTemplateDocument(
        categoryId,
        userId,
        userRole,
        userEmail
      );
    }

    await this.prisma.category.delete({
      where: { id: categoryId },
    });

    // Only log the category deletion (template removal is already logged)
    await this.auditService.log({
      userId,
      action: AuditAction.DELETE_CATEGORY,
      entity: AuditEntity.CATEGORY,
      entityId: categoryId,
      details: {
        createdByRole: userRole,
        createdByEmail: userEmail,
      },
    });

    return { message: 'Category deleted successfully' };
  }

  async uploadCategoryTemplateDocument(
    categoryId: string,
    file: any,
    userId: string,
    userRole?: string,
    userEmail?: string,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    this.assertValidTemplateFile(file);

    const category = await this.ensureCategoryExists(categoryId);

    const uploadsDir = join(process.cwd(), 'uploads', 'category-templates');
    await mkdir(uploadsDir, { recursive: true });

    const fileExt = this.resolveFileExtension(file);
    const uniqueName = `${categoryId}-${Date.now()}-${randomUUID()}${fileExt}`;
    const absolutePath = join(uploadsDir, uniqueName);

    await writeFile(absolutePath, file.buffer);

    const relativePath = relative(process.cwd(), absolutePath).replace(/\\/g, '/');

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: { documentTemplate: relativePath },
      select: {
        id: true,
        name: true,
        documentTemplate: true,
      },
    });

    if (category.documentTemplate) {
      const oldPath = this.toAbsolutePath(category.documentTemplate);
      if (oldPath !== absolutePath) {
        await this.deleteFileIfExists(oldPath);
      }
    }

    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE_CATEGORY,
      entity: AuditEntity.CATEGORY,
      entityId: updated.id,
      details: {
        documentTemplate: updated.documentTemplate,
        createdByRole: userRole,
        createdByEmail: userEmail,
      },
    });

    return {
      message: 'Template document uploaded successfully',
      category: updated,
    };
  }

  async removeCategoryTemplateDocument(
    categoryId: string,
    userId: string,
    userRole?: string,
    userEmail?: string,
  ) {
    const category = await this.ensureCategoryExists(categoryId);

    if (!category.documentTemplate) {
      throw new NotFoundException('No template document attached to this category');
    }

    const oldPath = this.toAbsolutePath(category.documentTemplate);

    await this.prisma.category.update({
      where: { id: categoryId },
      data: { documentTemplate: null },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE_CATEGORY,
      entity: AuditEntity.CATEGORY,
      entityId: categoryId,
      details: {
        documentTemplate: null,
        createdByRole: userRole,
        createdByEmail: userEmail,
      },
    });

    await this.deleteFileIfExists(oldPath);

    return { message: 'Template document removed successfully' };
  }

  async listAllSuppliers() {
    return this.prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            emailVerified: true,
          },
        },
      },
    });
  }

  async getSupplierById(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            emailVerified: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async getSupplierApplications(supplierId: string) {
    await this.ensureSupplierExists(supplierId);

    return this.prisma.application.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        documents: true,
        payments: true,
      },
    });
  }

  async getSupplierPayments(supplierId: string) {
    await this.ensureSupplierExists(supplierId);

    return this.prisma.payment.findMany({
      where: {
        application: {
          supplierId,
        },
      },
      orderBy: { submittedAt: 'desc' },
      include: {
        application: {
          select: {
            id: true,
            status: true,
            categoryId: true,
          },
        },
      },
    });
  }

  async updateSupplierStatus(
    supplierId: string,
    dto: UpdateSupplierStatusDto,
    userId: string,
    userRole?: string,
    userEmail?: string,
  ) {
    await this.ensureSupplierExists(supplierId);

    const updated = await this.prisma.supplier.update({
      where: { id: supplierId },
      data: { status: dto.status },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            emailVerified: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE_SUPPLIER,
      entity: AuditEntity.SUPPLIER,
      entityId: updated.id,
      details: {
        status: updated.status,
        createdByRole: userRole,
        createdByEmail: userEmail,
      },
    });

    return updated;
  }

  async deleteSupplier(
    supplierId: string,
    userId: string,
    userRole?: string,
    userEmail?: string,
  ) {
    await this.ensureSupplierExists(supplierId);

    const appCount = await this.prisma.application.count({
      where: { supplierId },
    });

    if (appCount > 0) {
      throw new ConflictException(
        'Cannot delete supplier with existing applications',
      );
    }

    await this.prisma.supplier.delete({
      where: { id: supplierId },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.DELETE_SUPPLIER,
      entity: AuditEntity.SUPPLIER,
      entityId: supplierId,
      details: {
        createdByRole: userRole,
        createdByEmail: userEmail,
      },
    });

    return { message: 'Supplier deleted successfully' };
  }

  private async ensureSupplierExists(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        documentTemplate: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private assertValidTemplateFile(file: any) {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF or Word documents are allowed');
    }
  }

  private resolveFileExtension(file: any) {
    if (file.mimetype === 'application/pdf') {
      return '.pdf';
    }

    if (file.mimetype === 'application/msword') {
      return '.doc';
    }

    if (
      file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return '.docx';
    }

    const originalExt = extname(file.originalname || '').toLowerCase();
    if (['.pdf', '.doc', '.docx'].includes(originalExt)) {
      return originalExt;
    }

    throw new BadRequestException('Unsupported template file format');
  }

  private toAbsolutePath(pathValue: string) {
    return isAbsolute(pathValue) ? pathValue : join(process.cwd(), pathValue);
  }

  private async deleteFileIfExists(pathValue: string) {
    try {
      await access(pathValue);
      await unlink(pathValue);
    } catch {
      return;
    }
  }
}
