import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/audit.types';
import {
	AdminApplicationsQueryDto,
	RejectApplicationDto,
	ReviewApplicationDto,
} from '../supplier/dto/application.dto';

@Injectable()
export class AdminApplicationService {
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
			throw new BadRequestException(
				'Only submitted applications can be marked under review',
			);
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
			throw new BadRequestException(
				'Only submitted or under review applications can be approved',
			);
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
			throw new BadRequestException(
				'Only submitted or under review applications can be rejected',
			);
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
}
