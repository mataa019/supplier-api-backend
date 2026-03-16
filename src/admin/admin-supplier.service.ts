import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CategoryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSupplierStatusDto } from './dto/update-supplier-status.dto';
import {
  CreateFormTemplateInput,
  FORM_TEMPLATE_LIBRARY,
  getLibraryTemplateByCode,
  TemplateFieldType,
} from './form-template.data';

@Injectable()
export class AdminSupplierService {
  constructor(private prisma: PrismaService) {}

  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        formTemplate: {
          select: {
            id: true,
            name: true,
            version: true,
            isActive: true,
          },
        },
      },
    });
  }

  async getCategoryById(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        formTemplate: {
          select: {
            id: true,
            name: true,
            version: true,
            description: true,
            isActive: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async createCategory(dto: {
    name?: string;
    description?: string;
    applicationFee?: number;
    status?: 'active' | 'inactive';
    templateId?: string;
    documentTemplate?: string;
  }) {
    if (!dto?.name?.trim()) {
      throw new BadRequestException('name is required');
    }

    if (typeof dto.applicationFee !== 'number' || Number.isNaN(dto.applicationFee)) {
      throw new BadRequestException('applicationFee must be a valid number');
    }

    if (dto.applicationFee < 0) {
      throw new BadRequestException('applicationFee cannot be negative');
    }

    if (dto.templateId) {
      await this.ensureTemplateExists(dto.templateId);
    }

    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        applicationFee: dto.applicationFee,
        status: dto.status ? (dto.status as CategoryStatus) : undefined,
        templateId: dto.templateId || null,
        documentTemplate: dto.documentTemplate?.trim() || null,
      },
      include: {
        formTemplate: {
          select: {
            id: true,
            name: true,
            version: true,
            isActive: true,
          },
        },
      },
    });
  }

  async updateCategory(
    categoryId: string,
    dto: {
      name?: string;
      description?: string;
      applicationFee?: number;
      status?: 'active' | 'inactive';
      templateId?: string | null;
      documentTemplate?: string | null;
    },
  ) {
    await this.ensureCategoryExists(categoryId);

    if (dto.templateId) {
      await this.ensureTemplateExists(dto.templateId);
    }

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
        templateId:
          dto.templateId === undefined ? undefined : dto.templateId,
        documentTemplate:
          dto.documentTemplate === undefined
            ? undefined
            : (dto.documentTemplate?.trim() || null),
      },
      include: {
        formTemplate: {
          select: {
            id: true,
            name: true,
            version: true,
            isActive: true,
          },
        },
      },
    });
  }

  async deleteCategory(categoryId: string) {
    await this.ensureCategoryExists(categoryId);

    const applicationCount = await this.prisma.application.count({
      where: { categoryId },
    });

    if (applicationCount > 0) {
      throw new ConflictException(
        'Cannot delete category with existing applications',
      );
    }

    await this.prisma.category.delete({
      where: { id: categoryId },
    });

    return { message: 'Category deleted successfully' };
  }

  async createFormTemplate(dto: CreateFormTemplateInput) {
    const libraryTemplate = getLibraryTemplateByCode(dto.templateCode);

    if (dto.templateCode && !libraryTemplate) {
      throw new BadRequestException('templateCode is invalid');
    }

    const fieldsInput =
      Array.isArray(dto.fields) && dto.fields.length > 0
        ? dto.fields
        : libraryTemplate?.fields;

    const name = dto.name?.trim() || libraryTemplate?.name;
    const version = dto.version?.trim() || libraryTemplate?.version || '1.0.0';
    const description = dto.description?.trim() || libraryTemplate?.description || null;

    this.validateTemplatePayload({
      ...dto,
      name,
      fields: fieldsInput,
    });

    const fields = fieldsInput!.map((field) => ({
      key: field.key.trim(),
      label: field.label.trim(),
      type: field.type,
      required: field.required ?? false,
      placeholder: field.placeholder?.trim() || null,
      helpText: field.helpText?.trim() || null,
      options: Array.isArray(field.options)
        ? field.options
            .map((option) => option?.trim())
            .filter((option): option is string => Boolean(option))
        : [],
    }));

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const template = await tx.formTemplate.create({
          data: {
            name,
            version,
            description,
            fields: fields as Prisma.InputJsonValue,
          },
        });

        if (dto.categoryId) {
          await tx.category.update({
            where: { id: dto.categoryId },
            data: { templateId: template.id },
          });
        }

        return tx.formTemplate.findUnique({
          where: { id: template.id },
          select: {
            id: true,
            name: true,
            version: true,
            description: true,
            fields: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            categories: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A form template with this name and version already exists',
        );
      }

      throw error;
    }
  }

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
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async listTemplateLibrary() {
    return FORM_TEMPLATE_LIBRARY;
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

  private async ensureTemplateExists(templateId: string) {
    const template = await this.prisma.formTemplate.findUnique({
      where: { id: templateId },
      select: { id: true },
    });

    if (!template) {
      throw new NotFoundException('Form template not found');
    }

    return template;
  }

  private validateTemplatePayload(dto: CreateFormTemplateInput) {
    if (!dto?.name?.trim()) {
      throw new BadRequestException('name is required');
    }

    if (!Array.isArray(dto.fields) || dto.fields.length === 0) {
      throw new BadRequestException('fields must contain at least one field');
    }

    const allowedTypes: TemplateFieldType[] = [
      'text',
      'textarea',
      'number',
      'email',
      'phone',
      'date',
      'select',
      'radio',
      'checkbox',
      'boolean',
    ];

    const seenKeys = new Set<string>();

    for (const field of dto.fields) {
      if (!field?.key?.trim()) {
        throw new BadRequestException('each field must have a key');
      }

      if (!field?.label?.trim()) {
        throw new BadRequestException('each field must have a label');
      }

      if (!allowedTypes.includes(field.type)) {
        throw new BadRequestException(
          `invalid field type: ${field.type}`,
        );
      }

      const normalizedKey = field.key.trim();
      if (seenKeys.has(normalizedKey)) {
        throw new BadRequestException(
          `duplicate field key: ${normalizedKey}`,
        );
      }
      seenKeys.add(normalizedKey);

      const requiresOptions = ['select', 'radio', 'checkbox'].includes(
        field.type,
      );
      if (requiresOptions && (!field.options || field.options.length === 0)) {
        throw new BadRequestException(
          `field ${normalizedKey} requires at least one option`,
        );
      }
    }
  }
  
}
