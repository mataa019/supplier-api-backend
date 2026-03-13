import {
	Controller,
	Get,
	Param,
	Post,
	Body,
	Patch,
	Delete,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../Auth/jwt/roles';
import { AdminService } from './admin.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import {
	ApiAdminEndpoint,
	ApiGetByIdEndpoint,
	ApiProtectedCreateEndpoint,
} from '../common/decorators';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AdminController {
	constructor(private adminService: AdminService) {}

	@Get()
	@ApiAdminEndpoint('List admin users', 'Returns admin users list')
	async listAdminUsers() {
		return this.adminService.listAdminUsers();
	}

	@Get(':userId')
	@ApiGetByIdEndpoint('Get single admin user', 'admin user')
	async getAdminUser(@Param('userId') userId: string) {
		return this.adminService.getAdminUser(userId);
	}

	@Post()
	@ApiProtectedCreateEndpoint('Create admin user', 'Admin user created')
	async createAdminUser(@Body() dto: CreateAdminUserDto) {
		return this.adminService.createAdminUser(dto);
	}

	@Patch(':userId')
	@ApiAdminEndpoint('Update admin user', 'Admin user updated')
	async updateAdminUser(
		@Param('userId') userId: string,
		@Body() dto: UpdateAdminUserDto,
	) {
		return this.adminService.updateAdminUser(userId, dto);
	}

	@Patch(':userId/status')
	@ApiAdminEndpoint('Toggle admin user status', 'Admin user status toggled')
	async toggleAdminUserStatus(@Param('userId') userId: string) {
		return this.adminService.toggleAdminUserStatus(userId);
	}

	@Delete(':userId')
	@ApiAdminEndpoint('Delete admin user', 'Admin user deleted')
	async deleteAdminUser(@Param('userId') userId: string) {
		return this.adminService.deleteAdminUser(userId);
	}
}
