import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSupplierStatusDto } from './dto/update-supplier-status.dto';

@Injectable()
export class AdminSupplierService {
  constructor(private prisma: PrismaService) {}

  async listFormTemplates() {
    return this.prisma.formTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { version: 'desc' }],
      select: {
        id: true,
        name: true,
        version: true,
        description: true,
        fields: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async assignCategoryTemplate(categoryId: string, templateId: string) {
    await this.ensureCategoryExists(categoryId);

    const template = await this.prisma.formTemplate.findFirst({
      where: { id: templateId, isActive: true },
      select: { id: true },
    });

    if (!template) {
      throw new NotFoundException('Form template not found');
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: { templateId },
      include: {
        formTemplate: true,
      },
    });
  }

  async unassignCategoryTemplate(categoryId: string) {
    await this.ensureCategoryExists(categoryId);

    return this.prisma.category.update({
      where: { id: categoryId },
      data: { templateId: null },
      include: {
        formTemplate: true,
      },
    });
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
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }
  
}
