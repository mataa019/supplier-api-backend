import {
	Injectable,
	NotFoundException,
	ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class AdminService {
	constructor(private prisma: PrismaService) {}

	async listAdminUsers() {
		return this.prisma.user.findMany({
			where: { role: 'admin' },
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

	async getAdminUser(userId: string) {
		const user = await this.prisma.user.findFirst({
			where: { id: userId, role: 'admin' },
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
			throw new NotFoundException('Admin user not found');
		}

		return user;
	}

	async createAdminUser(dto: CreateAdminUserDto) {
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
				role: 'admin',
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

	async updateAdminUser(userId: string, dto: UpdateAdminUserDto) {
		const existingUser = await this.prisma.user.findFirst({
			where: { id: userId, role: 'admin' },
		});

		if (!existingUser) {
			throw new NotFoundException('Admin user not found');
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

	async toggleAdminUserStatus(userId: string) {
		const existingUser = await this.prisma.user.findFirst({
			where: { id: userId, role: 'admin' },
			select: { id: true, status: true },
		});

		if (!existingUser) {
			throw new NotFoundException('Admin user not found');
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

	async deleteAdminUser(userId: string) {
		const existingUser = await this.prisma.user.findFirst({
			where: { id: userId, role: 'admin' },
			select: { id: true },
		});

		if (!existingUser) {
			throw new NotFoundException('Admin user not found');
		}

		await this.prisma.user.delete({
			where: { id: userId },
		});

		return { message: 'Admin user deleted successfully' };
	}
}
