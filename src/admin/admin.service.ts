import {
	Injectable,
	NotFoundException,
	ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AdminService {
	constructor(private prisma: PrismaService) {}

	getRoleOptions() {
		return {
			allRoles: ['supplier', 'manager', 'admin'] as const,
			assignableRoles: ['supplier', 'manager'] as const,
			nonAssignableRoles: ['admin'] as const,
		};
	}

	async listAccounts() {
		return this.prisma.user.findMany({
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				email: true,
				role: true,
				status: true,
				emailVerified: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	}

	async getAccount(accountId: string) {
		const account = await this.prisma.user.findFirst({
			where: { id: accountId },
			select: {
				id: true,
				email: true,
				role: true,
				status: true,
				emailVerified: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!account) {
			throw new NotFoundException('Account not found');
		}

		return account;
	}

	async createAccount(dto: CreateAccountDto) {
		const existingAccount = await this.prisma.user.findUnique({
			where: { email: dto.email },
		});

		if (existingAccount) {
			throw new ConflictException('Email already registered');
		}

		const hashedPassword = await bcrypt.hash(dto.password, 10);

		return this.prisma.user.create({
			data: {
				email: dto.email,
				password: hashedPassword,
				role: dto.role,
				status: dto.status ?? 'active',
			},
			select: {
				id: true,
				email: true,
				role: true,
				status: true,
				emailVerified: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	}

	async updateAccount(accountId: string, dto: UpdateAccountDto) {
		const existingAccount = await this.prisma.user.findFirst({
			where: { id: accountId },
		});

		if (!existingAccount) {
			throw new NotFoundException('Account not found');
		}

		if (dto.email && dto.email !== existingAccount.email) {
			const emailTakenAccount = await this.prisma.user.findUnique({
				where: { email: dto.email },
			});
			if (emailTakenAccount) {
				throw new ConflictException('Email already registered');
			}
		}

		const data: {
			email?: string;
			password?: string;
			status?: 'active' | 'inactive';
			role?: 'supplier' | 'manager';
		} = {};

		if (dto.email) {
			data.email = dto.email;
		}

		if (dto.password) {
			data.password = await bcrypt.hash(dto.password, 10);
		}

		if (dto.status) {
			data.status = dto.status;
		}

		if (dto.role && (dto.role === 'supplier' || dto.role === 'manager')) {
			data.role = dto.role;
		}

		return this.prisma.user.update({
			where: { id: accountId },
			data,
			select: {
				id: true,
				email: true,
				role: true,
				status: true,
				emailVerified: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	}

	async toggleAccountStatus(accountId: string) {
		const existingAccount = await this.prisma.user.findFirst({
			where: { id: accountId },
			select: { id: true, status: true },
		});

		if (!existingAccount) {
			throw new NotFoundException('Account not found');
		}

		const nextStatus = existingAccount.status === 'active' ? 'inactive' : 'active';

		return this.prisma.user.update({
			where: { id: accountId },
			data: { status: nextStatus },
			select: {
				id: true,
				email: true,
				role: true,
				status: true,
				emailVerified: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	}

	async deleteAccount(accountId: string) {
		const existingAccount = await this.prisma.user.findFirst({
			where: { id: accountId },
			select: { id: true },
		});

		if (!existingAccount) {
			throw new NotFoundException('Account not found');
		}

		await this.prisma.user.delete({
			where: { id: accountId },
		});

		return { message: 'Account deleted successfully' };
	}
}
