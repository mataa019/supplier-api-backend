import {
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { access } from 'fs/promises';
import { basename, isAbsolute, join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateOwnSupplierDto } from './dto/update-own-supplier.dto';

@Injectable()
export class SupplierService {
	constructor(private prisma: PrismaService) {}

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
			select: { id: true, userId: true, registrationNumber: true, tpin: true },
		});

		if (!existingSupplier) {
			throw new NotFoundException('Supplier profile not found');
		}

		if (
			dto.registrationNumber &&
			dto.registrationNumber !== existingSupplier.registrationNumber
		) {
			const duplicateRegistrationNumber = await this.prisma.supplier.findFirst({
				where: {
					registrationNumber: dto.registrationNumber,
					NOT: { id: existingSupplier.id },
				},
				select: { id: true },
			});

			if (duplicateRegistrationNumber) {
				throw new ConflictException('Registration number already registered');
			}
		}

		if (dto.tpin && dto.tpin !== existingSupplier.tpin) {
			const duplicateTpin = await this.prisma.supplier.findFirst({
				where: {
					tpin: dto.tpin,
					NOT: { id: existingSupplier.id },
				},
				select: { id: true },
			});

			if (duplicateTpin) {
				throw new ConflictException('TPIN already registered');
			}
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


}
