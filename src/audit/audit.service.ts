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

  // ─────────────────────────────────────────────────────────────────────────────
  // Convenience methods for common audit actions
  // ─────────────────────────────────────────────────────────────────────────────

  async logRegister(userId: string, email: string, role: string, ip?: string) {
    return this.log({
      userId,
      action: 'REGISTER',
      entity: 'User',
      entityId: userId,
      details: JSON.stringify({ email, role }),
      ipAddress: ip,
    });
  }

  async logLogin(userId: string, email: string, role: string, ip?: string) {
    return this.log({
      userId,
      action: 'LOGIN',
      entity: 'User',
      entityId: userId,
      details: JSON.stringify({ email, role }),
      ipAddress: ip,
    });
  }

  async logLoginFailed(email: string, reason: string, userId?: string, ip?: string) {
    return this.log({
      userId,
      action: 'LOGIN_FAILED',
      entity: 'User',
      entityId: userId,
      details: JSON.stringify({ email, reason }),
      ipAddress: ip,
    });
  }

  async logLogout(userId: string, email: string, ip?: string) {
    return this.log({
      userId,
      action: 'LOGOUT',
      entity: 'User',
      entityId: userId,
      details: JSON.stringify({ email }),
      ipAddress: ip,
    });
  }

  async logCreateUser(adminId: string, createdUserId: string, email: string, role: string, ip?: string) {
    return this.log({
      userId: adminId,
      action: 'CREATE_USER',
      entity: 'User',
      entityId: createdUserId,
      details: JSON.stringify({ email, role }),
      ipAddress: ip,
    });
  }

  async logUpdateUser(adminId: string, targetUserId: string, changes: Record<string, unknown>, ip?: string) {
    return this.log({
      userId: adminId,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: targetUserId,
      details: JSON.stringify(changes),
      ipAddress: ip,
    });
  }

  async logDeleteUser(adminId: string, deletedUserId: string, email: string, ip?: string) {
    return this.log({
      userId: adminId,
      action: 'DELETE_USER',
      entity: 'User',
      entityId: deletedUserId,
      details: JSON.stringify({ email }),
      ipAddress: ip,
    });
  }
}
