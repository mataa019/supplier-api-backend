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
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import {
	ApiAdminEndpoint,
	ApiGetByIdEndpoint,
	ApiProtectedCreateEndpoint,
} from '../common/decorators';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/accounts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AdminController {
	constructor(private adminService: AdminService) {}

	@Get()
	@ApiAdminEndpoint(
		'List accounts',
		'Returns supplier/manager/admin accounts',
	)
	async listAccounts() {
		return this.adminService.listAccounts();
	}

	@Get('meta/roles')
	@ApiAdminEndpoint(
		'Get role options',
		'Returns available and assignable roles for account management',
	)
	async getRoleOptions() {
		return this.adminService.getRoleOptions();
	}

	@Get(':accountId')
	@ApiGetByIdEndpoint('Get single account', 'Account details')
	async getAccount(@Param('accountId') accountId: string) {
		return this.adminService.getAccount(accountId);
	}

	@Post()
	@ApiProtectedCreateEndpoint(
		'Create account',
		'Supplier/manager/admin account created',
	)
	async createAccount(@Body() dto: CreateAccountDto) {
		return this.adminService.createAccount(dto);
	}

	@Patch(':accountId')
	@ApiAdminEndpoint('Update account', 'Account updated')
	async updateAccount(
		@Param('accountId') accountId: string,
		@Body() dto: UpdateAccountDto,
	) {
		return this.adminService.updateAccount(accountId, dto);
	}

	@Patch(':accountId/status')
	@ApiAdminEndpoint('Toggle account status', 'Account status toggled')
	async toggleAccountStatus(@Param('accountId') accountId: string) {
		return this.adminService.toggleAccountStatus(accountId);
	}

	@Delete(':accountId')
	@ApiAdminEndpoint('Delete account', 'Account deleted')
	async deleteAccount(@Param('accountId') accountId: string) {
		return this.adminService.deleteAccount(accountId);
	}
}
