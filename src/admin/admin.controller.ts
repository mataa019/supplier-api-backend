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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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
	@ApiAdminEndpoint('List users', 'Returns users list (excluding admins)')
	async listUsers() {
		return this.adminService.listUsers();
	}

	@Get(':userId')
	@ApiGetByIdEndpoint('Get single user', 'User details (excluding admins)')
	async getUser(@Param('userId') userId: string) {
		return this.adminService.getUser(userId);
	}

	@Post()
	@ApiProtectedCreateEndpoint('Create user', 'User created')
	async createUser(@Body() dto: CreateUserDto) {
		return this.adminService.createUser(dto);
	}

	@Patch(':userId')
	@ApiAdminEndpoint('Update user', 'User updated')
	async updateUser(
		@Param('userId') userId: string,
		@Body() dto: UpdateUserDto,
	) {
		return this.adminService.updateUser(userId, dto);
	}

	@Patch(':userId/status')
	@ApiAdminEndpoint('Toggle user status', 'User status toggled')
	async toggleUserStatus(@Param('userId') userId: string) {
		return this.adminService.toggleUserStatus(userId);
	}

	@Delete(':userId')
	@ApiAdminEndpoint('Delete user', 'User deleted')
	async deleteUser(@Param('userId') userId: string) {
		return this.adminService.deleteUser(userId);
	}
}
