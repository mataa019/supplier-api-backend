import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogParams {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /** Write an audit trail entry */
  async log(params: AuditLogParams) {
    return this.prisma.audit.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
        ipAddress: params.ipAddress,
      },
    });
  }

  /** List audit entries with optional filters and pagination */
  async findAll(query: {
    userId?: string;
    action?: string;
    entity?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;
    if (query.entity) where.entity = query.entity;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) (where.createdAt as Record<string, unknown>).gte = new Date(query.from);
      if (query.to) (where.createdAt as Record<string, unknown>).lte = new Date(query.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.audit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, role: true },
          },
        },
      }),
      this.prisma.audit.count({ where }),
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

  /** Get a single audit entry by ID */
  async findOne(id: string) {
    return this.prisma.audit.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
      },
    });
  }
}
