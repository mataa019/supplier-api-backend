import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { access } from 'fs/promises';
import { basename, isAbsolute, join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/audit.types';
import {
	CreateApplicationDto,
	SubmitApplicationDto,
	SupplierApplicationsQueryDto,
	UpdateApplicationDto,
	WithdrawApplicationDto,
} from '../common/dto/application.dto';
import { UpdateOwnSupplierDto } from './dto/update-own-supplier.dto';

@Injectable()
export class SupplierService {
	constructor(
		private prisma: PrismaService,
		private auditService: AuditService,
	) {}

	async createApplication(userId: string, dto: CreateApplicationDto) {
		const supplier = await this.getSupplierByUserId(userId);
		await this.ensureActiveCategoryExists(dto.categoryId);

		const application = await this.prisma.application.create({
			data: {
				supplierId: supplier.id,
				categoryId: dto.categoryId,
				notes: dto.notes?.trim() || null,
				status: 'draft',
			},
			include: this.applicationInclude(),
		});

		await this.auditService.log({
			userId,
			action: AuditAction.CREATE_APPLICATION,
			entity: AuditEntity.APPLICATION,
			entityId: application.id,
			details: { categoryId: application.categoryId, status: application.status },
		});

		return application;
	}

	async listMyApplications(userId: string, query: SupplierApplicationsQueryDto) {
		const supplier = await this.getSupplierByUserId(userId);
		const page = query.page ?? 1;
		const limit = query.limit ?? 10;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {
			supplierId: supplier.id,
		};

		if (query.status) where.status = query.status;
		if (query.search) {
			where.OR = [
				{ category: { name: { contains: query.search } } },
				{ remarks: { contains: query.search } },
				{ notes: { contains: query.search } },
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

	async getApplication(userId: string, applicationId: string) {
		return this.getOwnedApplication(userId, applicationId);
	}

	async updateApplication(
		userId: string,
		applicationId: string,
		dto: UpdateApplicationDto,
	) {
		const application = await this.getOwnedApplication(userId, applicationId);

		if (application.status !== 'draft') {
			throw new BadRequestException('Only draft applications can be updated');
		}

		if (dto.categoryId) {
			await this.ensureActiveCategoryExists(dto.categoryId);
		}

		const updated = await this.prisma.application.update({
			where: { id: applicationId },
			data: {
				categoryId: dto.categoryId ?? undefined,
				notes: dto.notes === undefined ? undefined : dto.notes?.trim() || null,
			},
			include: this.applicationInclude(),
		});

		await this.auditService.log({
			userId,
			action: AuditAction.UPDATE_APPLICATION,
			entity: AuditEntity.APPLICATION,
			entityId: updated.id,
			details: { categoryId: updated.categoryId, status: updated.status },
		});

		return updated;
	}

	async submitApplication(
		userId: string,
		applicationId: string,
		dto: SubmitApplicationDto,
	) {
		if (!dto.declarationAccepted) {
			throw new BadRequestException('declarationAccepted must be true');
		}

		const application = await this.getOwnedApplication(userId, applicationId);
		if (application.status !== 'draft') {
			throw new BadRequestException('Only draft applications can be submitted');
		}

		const updated = await this.prisma.application.update({
			where: { id: applicationId },
			data: {
				status: 'submitted',
				submittedAt: new Date(),
			},
			include: this.applicationInclude(),
		});

		await this.auditService.log({
			userId,
			action: AuditAction.SUBMIT_APPLICATION,
			entity: AuditEntity.APPLICATION,
			entityId: updated.id,
			details: { status: updated.status },
		});

		return updated;
	}

	async withdrawApplication(
		userId: string,
		applicationId: string,
		dto: WithdrawApplicationDto,
	) {
		const application = await this.getOwnedApplication(userId, applicationId);

		if (!['draft', 'submitted', 'under_review'].includes(application.status)) {
			throw new BadRequestException('This application cannot be withdrawn');
		}

		const updated = await this.prisma.application.update({
			where: { id: applicationId },
			data: {
				status: 'withdrawn',
				remarks: dto.reason.trim(),
			},
			include: this.applicationInclude(),
		});

		await this.auditService.log({
			userId,
			action: AuditAction.WITHDRAW_APPLICATION,
			entity: AuditEntity.APPLICATION,
			entityId: updated.id,
			details: { status: updated.status, reason: dto.reason },
		});

		return updated;
	}

	async getApplicationTimeline(userId: string, applicationId: string) {
		await this.getOwnedApplication(userId, applicationId);

		const logs = await this.prisma.audit.findMany({
			where: {
				entity: AuditEntity.APPLICATION,
				entityId: applicationId,
			},
			orderBy: { createdAt: 'asc' },
			include: {
				user: {
					select: { id: true, email: true, role: true },
				},
			},
		});

		return logs.map((log) => ({
			id: log.id,
			action: log.action,
			entity: log.entity,
			entityId: log.entityId,
			details: this.parseDetails(log.details),
			actor: log.user,
			createdAt: log.createdAt,
		}));
	}

	async listCategories() {
		return this.prisma.category.findMany({
			where: { status: 'active' },
			select: {
				id: true,
				name: true,
				description: true,
				applicationFee: true,
				Requirements: true,
				status: true,
				createdAt: true,
				documentTemplate: true,
			},
			orderBy: { createdAt: 'desc' },
		});
	}

	async getCategoryById(categoryId: string, baseUrl: string = '') {
		const category = await this.prisma.category.findUnique({
			where: { id: categoryId },
			select: {
				id: true,
				name: true,
				description: true,
				applicationFee: true,
				Requirements: true,
				status: true,
				createdAt: true,
				documentTemplate: true,
			},
		});

		if (!category) {
			throw new NotFoundException('Category not found');
		}

		return {
			...category,
			hasTemplateDocument: !!category.documentTemplate,
			templateDownloadUrl: category.documentTemplate
				? `${baseUrl}/suppliers/categories/${category.id}/template`
				: null,
		};
	}

	async getCategoryTemplateDocument(categoryId: string) {
		const category = await this.prisma.category.findUnique({
			where: { id: categoryId },
			select: {
				id: true,
				name: true,
				documentTemplate: true,
			},
		});

		if (!category) {
			throw new NotFoundException('Category not found');
		}

		if (!category.documentTemplate) {
			throw new NotFoundException('No template document attached to this category');
		}

		const absolutePath = isAbsolute(category.documentTemplate)
			? category.documentTemplate
			: join(process.cwd(), category.documentTemplate);

		try {
			await access(absolutePath);
		} catch {
			throw new NotFoundException('Template document not found on server');
		}

		return {
			categoryId: category.id,
			categoryName: category.name,
			absolutePath,
			fileName: basename(absolutePath),
		};
	}

	async getOwnProfile(userId: string) {
		const supplier = await this.prisma.supplier.findUnique({
			where: { userId },
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
			throw new NotFoundException('Supplier profile not found');
		}

		return supplier;
	}

	async updateOwnProfile(userId: string, dto: UpdateOwnSupplierDto) {
		const existingSupplier = await this.prisma.supplier.findUnique({
			where: { userId },
			select: { id: true, userId: true },
		});

		if (!existingSupplier) {
			throw new NotFoundException('Supplier profile not found');
		}
		return this.prisma.supplier.update({
			where: { userId },
			data: {
				companyName: dto.companyName,
				registrationNumber: dto.registrationNumber,
				tpin: dto.tpin,
				contactPerson: dto.contactPerson,
				phone: dto.phone,
				email: dto.email,
				address: dto.address,
			},
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

	private async getSupplierByUserId(userId: string) {
		const supplier = await this.prisma.supplier.findUnique({
			where: { userId },
			select: { id: true, userId: true, companyName: true },
		});

		if (!supplier) {
			throw new NotFoundException('Supplier profile not found');
		}

		return supplier;
	}

	private async ensureActiveCategoryExists(categoryId: string) {
		const category = await this.prisma.category.findUnique({
			where: { id: categoryId },
			select: { id: true, status: true },
		});

		if (!category) {
			throw new NotFoundException('Category not found');
		}

		if (category.status !== 'active') {
			throw new BadRequestException('Only active categories can be used');
		}

		return category;
	}

	private async getOwnedApplication(userId: string, applicationId: string) {
		const supplier = await this.getSupplierByUserId(userId);
		const application = await this.prisma.application.findFirst({
			where: {
				id: applicationId,
				supplierId: supplier.id,
			},
			include: this.applicationInclude(),
		});

		if (!application) {
			throw new NotFoundException('Application not found');
		}

		return application;
	}

	private applicationInclude() {
		return {
			category: {
				select: {
					id: true,
					name: true,
					description: true,
					applicationFee: true,
					Requirements: true,
					documentTemplate: true,
					status: true,
				},
			},
			documents: true,
			payments: true,
		};
	}

	private parseDetails(details?: string | null) {
		if (!details) return null;
		try {
			return JSON.parse(details);
		} catch {
			return details;
		}
	}

}
