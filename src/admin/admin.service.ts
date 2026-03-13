import {
	Injectable,
	NotFoundException,
	ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AdminService {
	constructor(private prisma: PrismaService) {}

	async listUsers() {
		return this.prisma.user.findMany({
			where: { NOT: { role: 'admin' } },
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

	async getUser(userId: string) {
		const user = await this.prisma.user.findFirst({
			where: { id: userId, NOT: { role: 'admin' } },
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

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return user;
	}

	async createUser(dto: CreateUserDto) {
		const existingUser = await this.prisma.user.findUnique({
			where: { email: dto.email },
		});

		if (existingUser) {
			throw new ConflictException('Email already registered');
		}

		const hashedPassword = await bcrypt.hash(dto.password, 10);

		return this.prisma.user.create({
			data: {
				email: dto.email,
				password: hashedPassword,
				role: dto.role ?? 'supplier',
				status: 'active',
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

	async updateUser(userId: string, dto: UpdateUserDto) {
		const existingUser = await this.prisma.user.findFirst({
			where: { id: userId, NOT: { role: 'admin' } },
		});

		if (!existingUser) {
			throw new NotFoundException('User not found');
		}

		if (dto.email && dto.email !== existingUser.email) {
			const emailTaken = await this.prisma.user.findUnique({
				where: { email: dto.email },
			});
			if (emailTaken) {
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

		if (dto.role) {
			data.role = dto.role;
		}

		return this.prisma.user.update({
			where: { id: userId },
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

	async toggleUserStatus(userId: string) {
		const existingUser = await this.prisma.user.findFirst({
			where: { id: userId, NOT: { role: 'admin' } },
			select: { id: true, status: true },
		});

		if (!existingUser) {
			throw new NotFoundException('User not found');
		}

		const nextStatus = existingUser.status === 'active' ? 'inactive' : 'active';

		return this.prisma.user.update({
			where: { id: userId },
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

	async deleteUser(userId: string) {
		const existingUser = await this.prisma.user.findFirst({
			where: { id: userId, NOT: { role: 'admin' } },
			select: { id: true },
		});

		if (!existingUser) {
			throw new NotFoundException('User not found');
		}

		await this.prisma.user.delete({
			where: { id: userId },
		});

		return { message: 'User deleted successfully' };
	}
}
