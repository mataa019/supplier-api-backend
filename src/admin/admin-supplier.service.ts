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
import {
  AdminApplicationsQueryDto,
  RejectApplicationDto,
  ReviewApplicationDto,
} from '../common/dto/application.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { UpdateSupplierStatusDto } from './dto/update-supplier-status.dto';

@Injectable()
export class AdminSupplierService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async listApplications(query: AdminApplicationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.search) {
      where.OR = [
        { remarks: { contains: query.search } },
        { notes: { contains: query.search } },
        { category: { name: { contains: query.search } } },
        { supplier: { companyName: { contains: query.search } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        include: this.applicationInclude(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getApplication(applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: this.applicationInclude(),
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async markUnderReview(
    applicationId: string,
    reviewerId: string,
    dto: ReviewApplicationDto,
  ) {
    const application = await this.ensureApplicationExists(applicationId);

    if (!['submitted', 'under_review'].includes(application.status)) {
      throw new BadRequestException('Only submitted applications can be marked under review');
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'under_review',
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        remarks: dto.remarks?.trim() || null,
      },
      include: this.applicationInclude(),
    });

    await this.auditService.log({
      userId: reviewerId,
      action: AuditAction.REVIEW_APPLICATION,
      entity: AuditEntity.APPLICATION,
      entityId: updated.id,
      details: { status: updated.status, remarks: dto.remarks ?? null },
    });

    return updated;
  }

  async approveApplication(
    applicationId: string,
    reviewerId: string,
    dto: ReviewApplicationDto,
  ) {
    const application = await this.ensureApplicationExists(applicationId);

    if (!['submitted', 'under_review'].includes(application.status)) {
      throw new BadRequestException('Only submitted or under review applications can be approved');
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        remarks: dto.remarks?.trim() || null,
      },
      include: this.applicationInclude(),
    });

    await this.auditService.log({
      userId: reviewerId,
      action: AuditAction.APPROVE_APPLICATION,
      entity: AuditEntity.APPLICATION,
      entityId: updated.id,
      details: { status: updated.status, remarks: dto.remarks ?? null },
    });

    return updated;
  }

  async rejectApplication(
    applicationId: string,
    reviewerId: string,
    dto: RejectApplicationDto,
  ) {
    const application = await this.ensureApplicationExists(applicationId);

    if (!['submitted', 'under_review'].includes(application.status)) {
      throw new BadRequestException('Only submitted or under review applications can be rejected');
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        remarks: dto.remarks.trim(),
      },
      include: this.applicationInclude(),
    });

    await this.auditService.log({
      userId: reviewerId,
      action: AuditAction.REJECT_APPLICATION,
      entity: AuditEntity.APPLICATION,
      entityId: updated.id,
      details: { status: updated.status, remarks: dto.remarks },
    });

    return updated;
  }

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

  async createCategory(dto: CreateCategoryDto) {
    if (!dto?.name?.trim()) {
      throw new BadRequestException('name is required');
    }

    if (typeof dto.applicationFee !== 'number' || Number.isNaN(dto.applicationFee)) {
      throw new BadRequestException('applicationFee must be a valid number');
    }

    if (dto.applicationFee < 0) {
      throw new BadRequestException('applicationFee cannot be negative');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        applicationFee: dto.applicationFee,
        status: dto.status ? (dto.status as CategoryStatus) : undefined,
        documentTemplate: dto.documentTemplate?.trim() || null,
        Requirements: dto.requirements.trim(),
      },
    });
  }

  async updateCategory(
    categoryId: string,
    dto: UpdateCategoryDto,
  ) {
    await this.ensureCategoryExists(categoryId);

    if (
      typeof dto.applicationFee === 'number' &&
      (Number.isNaN(dto.applicationFee) || dto.applicationFee < 0)
    ) {
      throw new BadRequestException('applicationFee must be a non-negative number');
    }

    return this.prisma.category.update({
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
        documentTemplate:
          dto.documentTemplate === undefined
            ? undefined
            : (dto.documentTemplate?.trim() || null),
      },
    });
  }

  async deleteCategory(categoryId: string) {
    const category = await this.ensureCategoryExists(categoryId);

    const applicationCount = await this.prisma.application.count({
      where: { categoryId },
    });

    if (applicationCount > 0) {
      throw new ConflictException(
        'Cannot delete category with existing applications',
      );
    }

    if (category.documentTemplate) {
      const oldPath = this.toAbsolutePath(category.documentTemplate);
      await this.deleteFileIfExists(oldPath);
    }

    await this.prisma.category.delete({
      where: { id: categoryId },
    });

    return { message: 'Category deleted successfully' };
  }

  async uploadCategoryTemplateDocument(
    categoryId: string,
    file: any,
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

    return {
      message: 'Template document uploaded successfully',
      category: updated,
    };
  }

  async removeCategoryTemplateDocument(categoryId: string) {
    const category = await this.ensureCategoryExists(categoryId);

    if (!category.documentTemplate) {
      throw new NotFoundException('No template document attached to this category');
    }

    const oldPath = this.toAbsolutePath(category.documentTemplate);

    await this.prisma.category.update({
      where: { id: categoryId },
      data: { documentTemplate: null },
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

  async updateSupplierStatus(supplierId: string, dto: UpdateSupplierStatusDto) {
    await this.ensureSupplierExists(supplierId);

    return this.prisma.supplier.update({
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
  }

  async deleteSupplier(supplierId: string) {
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

  private async ensureApplicationExists(applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, status: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  private applicationInclude() {
    return {
      category: true,
      supplier: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      },
      documents: true,
      payments: true,
    };
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
