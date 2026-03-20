import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction, AuditEntity } from './audit.types';

export interface AuditLogParams {
  userId?: string;
  action: AuditAction;
  entity?: AuditEntity;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Write an audit trail entry
   * @example
   * await this.audit.log({
   *   userId: user.id,
   *   action: AuditAction.LOGIN,
   *   entity: AuditEntity.USER,
   *   entityId: user.id,
   *   details: { email: user.email },
   * });
   */
  async log(params: AuditLogParams) {
    return this.prisma.audit.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details ? JSON.stringify(params.details) : undefined,
        ipAddress: params.ipAddress,
      },
    });
  }

  /** List audit entries with optional filters and pagination */
  async findAll(query: {
    userId?: string;
    action?: AuditAction;
    entity?: AuditEntity;
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

    const normalized = data.map((entry) => ({
      ...entry,
      details: this.parseDetails(entry.details),
    }));

    return {
      data: normalized,
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
    const normalizedId = id.trim();

    const entryById = await this.prisma.audit.findUnique({
      where: { id: normalizedId },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    const entry =
      entryById ??
      (await this.prisma.audit.findFirst({
        where: { userId: normalizedId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, role: true },
          },
        },
      }));

    if (!entry) {
      return null;
    }

    return {
      ...entry,
      details: this.parseDetails(entry.details),
    };
  }

  private parseDetails(details?: string | null) {
    if (!details) {
      return null;
    }

    try {
      return JSON.parse(details);
    } catch {
      return details;
    }
  }
}
