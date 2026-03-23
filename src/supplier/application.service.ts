import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/audit.types';
import {
	CreateApplicationDto,
	UploadApplicationDocumentDto,
	SubmitApplicationDto,
	SupplierApplicationsQueryDto,
	UpdateApplicationDto,
	WithdrawApplicationDto,
} from './dto/application.dto';

@Injectable()
export class SupplierApplicationService {
	constructor(
		private prisma: PrismaService,
		private auditService: AuditService,
	) {}

	async createApplication(userId: string, dto: CreateApplicationDto) {
		const supplier = await this.getSupplierByUserId(userId);
		const actor = await this.getUserAuditContext(userId);
		await this.ensureActiveCategoryExists(dto.categoryId);

		const application = await this.prisma.application.create({
			data: {
				supplierId: supplier.id,
				categoryId: dto.categoryId,
				status: 'draft',
			},
			include: this.applicationInclude(),
		});

		await this.auditService.log({
			userId,
			action: AuditAction.CREATE_APPLICATION,
			entity: AuditEntity.APPLICATION,
			entityId: application.id,
			details: {
				categoryId: application.categoryId,
				status: application.status,
				createdByRole: actor.role,
				createdByEmail: actor.email,
			},
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
		const actor = await this.getUserAuditContext(userId);

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
			},
			include: this.applicationInclude(),
		});

		await this.auditService.log({
			userId,
			action: AuditAction.UPDATE_APPLICATION,
			entity: AuditEntity.APPLICATION,
			entityId: updated.id,
			details: {
				categoryId: updated.categoryId,
				status: updated.status,
				createdByRole: actor.role,
				createdByEmail: actor.email,
			},
		});

		return updated;
	}

	async submitApplication(
		userId: string,
		applicationId: string,
		dto: SubmitApplicationDto,
	) {
		if (!dto.declarationAccepted) {
			throw new BadRequestException('declaration Accepted must be true');
		}

		const application = await this.getOwnedApplication(userId, applicationId);
		const actor = await this.getUserAuditContext(userId);
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
			details: {
				status: updated.status,
				createdByRole: actor.role,
				createdByEmail: actor.email,
			},
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

	async withdrawApplication(
		userId: string,
		applicationId: string,
		dto: WithdrawApplicationDto,
	) {
		const application = await this.getOwnedApplication(userId, applicationId);
		const actor = await this.getUserAuditContext(userId);

		if (!['submitted', 'under_review'].includes(application.status)) {
			throw new BadRequestException(
				'Only submitted or under review applications can be withdrawn',
			);
		}

		const updated = await this.prisma.application.update({
			where: { id: applicationId },
			data: {
				status: 'withdrawn' as any,
				remarks: dto.reason.trim(),
				reviewedAt: new Date(),
				reviewedBy: userId,
			},
			include: this.applicationInclude(),
		});

		await this.auditService.log({
			userId,
			action: AuditAction.WITHDRAW_APPLICATION,
			entity: AuditEntity.APPLICATION,
			entityId: updated.id,
			details: {
				status: updated.status,
				reason: dto.reason,
				createdByRole: actor.role,
				createdByEmail: actor.email,
			},
		});

		return updated;
	}

	async uploadApplicationDocument(
		userId: string,
		applicationId: string,
		dto: UploadApplicationDocumentDto,
		file: any,
	) {
		const application = await this.getOwnedApplication(userId, applicationId);
		const actor = await this.getUserAuditContext(userId);

		if (!file) {
			throw new BadRequestException('Document file is required');
		}

		if (!['draft', 'submitted', 'under_review'].includes(application.status)) {
			throw new BadRequestException(
				'Documents can only be uploaded for draft, submitted, or under review applications',
			);
		}

		const extension = this.resolveDocumentExtension(file);
		const relativeDirectory = join('uploads', 'application-documents');
		const absoluteDirectory = join(process.cwd(), relativeDirectory);
		await mkdir(absoluteDirectory, { recursive: true });

		const storedFileName = `${randomUUID()}${extension}`;
		const relativePath = join(relativeDirectory, storedFileName);
		const absolutePath = join(process.cwd(), relativePath);
		await writeFile(absolutePath, file.buffer);

		const created = await this.prisma.document.create({
			data: {
				applicationId,
				type: dto.type,
				fileName: file.originalname || storedFileName,
				filePath: relativePath,
			},
		});

		await this.auditService.log({
			userId,
			action: AuditAction.UPLOAD_DOCUMENT,
			entity: AuditEntity.DOCUMENT,
			entityId: created.id,
			details: {
				applicationId,
				type: created.type,
				fileName: created.fileName,
				description: dto.description ?? null,
				createdByRole: actor.role,
				createdByEmail: actor.email,
			},
		});

		return created;
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

	private async getUserAuditContext(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { role: true, email: true },
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return user;
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

	private resolveDocumentExtension(file: any) {
		const mimeToExt: Record<string, string> = {
			'application/pdf': '.pdf',
			'application/msword': '.doc',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
				'.docx',
			'image/jpeg': '.jpg',
			'image/png': '.png',
		};

		if (file?.mimetype && mimeToExt[file.mimetype]) {
			return mimeToExt[file.mimetype];
		}

		const extension = extname(file?.originalname || '').toLowerCase();
		if (['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'].includes(extension)) {
			return extension === '.jpeg' ? '.jpg' : extension;
		}

		throw new BadRequestException(
			'Unsupported file type. Allowed: pdf, doc, docx, jpg, png',
		);
	}
}
