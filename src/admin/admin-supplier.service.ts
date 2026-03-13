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
}
