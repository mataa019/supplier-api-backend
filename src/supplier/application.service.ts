import { DocumentType, Document as PrismaDocument } from '@prisma/client';
import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
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

	async listMyApplications(userId: string) {
		       const supplier = await this.getSupplierByUserId(userId);
		       const applications = await this.prisma.application.findMany({
			       where: { supplierId: supplier.id },
			       include: this.applicationInclude(),
			       orderBy: { createdAt: 'desc' },
		       });
		       // Only return the applications and their status
		       return applications.map(app => ({
			       id: app.id,
			       status: app.status,
			       category: app.category,
			       submittedAt: app.submittedAt,
			       reviewedAt: app.reviewedAt,
			       remarks: app.remarks,
			       createdAt: app.createdAt,
			       documents: app.documents,
			       payments: app.payments,
		       }));
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

	async uploadApplicationDocuments(
		userId: string,
		applicationId: string,
		documents: { type: string; description?: string }[],
		files: any[],
	) {
		const application = await this.getOwnedApplication(userId, applicationId);
		const actor = await this.getUserAuditContext(userId);

		if (!files || !Array.isArray(files) || files.length === 0) {
			throw new BadRequestException('At least one document file is required');
		}
		if (!Array.isArray(documents) || documents.length !== files.length) {
			throw new BadRequestException('Documents metadata and files count mismatch');
		}

		if (!['draft', 'submitted', 'under_review'].includes(application.status)) {
			throw new BadRequestException(
				'Documents can only be uploaded for draft, submitted, or under review applications',
			);
		}

		const relativeDirectory = join('uploads', 'application-documents');
		const absoluteDirectory = join(process.cwd(), relativeDirectory);
		await mkdir(absoluteDirectory, { recursive: true });

			   const createdDocs: PrismaDocument[] = [];
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const docMeta = documents[i];
			const extension = this.resolveDocumentExtension(file);
			const storedFileName = `${randomUUID()}${extension}`;
			const relativePath = join(relativeDirectory, storedFileName);
			const absolutePath = join(process.cwd(), relativePath);
			await writeFile(absolutePath, file.buffer);
			// Validate and cast docMeta.type to DocumentType
			if (!Object.values(DocumentType).includes(docMeta.type as DocumentType)) {
				throw new BadRequestException(`Invalid document type: ${docMeta.type}`);
			}
			const created = await this.prisma.document.create({
				data: {
					applicationId,
					type: docMeta.type as DocumentType,
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
					description: docMeta.description ?? null,
					createdByRole: actor.role,
					createdByEmail: actor.email,
				},
			});
			   createdDocs.push(created);
		}
		return createdDocs;
	}

	async listApplicationDocuments(userId: string, applicationId: string) {
		await this.getOwnedApplication(userId, applicationId);

		return this.prisma.document.findMany({
			where: { applicationId },
			orderBy: { uploadedAt: 'desc' },
		});
	}

	async getDocumentForDownload(userId: string, role: string, documentId: string) {
		const document = await this.prisma.document.findUnique({
			where: { id: documentId },
			include: {
				application: {
					select: {
						id: true,
						supplier: {
							select: { userId: true },
						},
					},
				},
			},
		});

		if (!document) {
			throw new NotFoundException('Document not found');
		}

		if (role === 'supplier' && document.application.supplier.userId !== userId) {
			throw new NotFoundException('Document not found');
		}

		const absolutePath = join(process.cwd(), document.filePath);

		try {
			await access(absolutePath);
		} catch {
			throw new NotFoundException('Document file not found');
		}

		return {
			fileName: document.fileName,
			absolutePath,
		};
	}

	async deleteDocument(userId: string, documentId: string) {
		const actor = await this.getUserAuditContext(userId);
		const document = await this.prisma.document.findUnique({
			where: { id: documentId },
			include: {
				application: {
					select: {
						id: true,
						status: true,
						supplier: {
							select: { userId: true },
						},
					},
				},
			},
		});

		if (!document || document.application.supplier.userId !== userId) {
			throw new NotFoundException('Document not found');
		}

		if (!['draft', 'submitted', 'under_review'].includes(document.application.status)) {
			throw new BadRequestException(
				'Documents can only be deleted for draft, submitted, or under review applications',
			);
		}

		await this.prisma.document.delete({ where: { id: documentId } });

		const absolutePath = join(process.cwd(), document.filePath);
		try {
			await unlink(absolutePath);
		} catch {
			// ignore missing or locked file cleanup failures
		}

		await this.auditService.log({
			userId,
			action: AuditAction.DELETE_DOCUMENT,
			entity: AuditEntity.DOCUMENT,
			entityId: documentId,
			details: {
				applicationId: document.application.id,
				type: document.type,
				fileName: document.fileName,
				createdByRole: actor.role,
				createdByEmail: actor.email,
			},
		});

		return { message: 'Document deleted successfully' };
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
