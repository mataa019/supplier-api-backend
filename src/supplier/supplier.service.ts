import {
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateOwnSupplierDto } from './dto/update-own-supplier.dto';

@Injectable()
export class SupplierService {
	constructor(private prisma: PrismaService) {}

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

}
