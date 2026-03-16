import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Request,
	Req,
	Res,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupplierService } from './supplier.service';
import { JwtUser } from '../Auth/jwt/types';
import { Roles, RolesGuard } from '../Auth/jwt/roles';
import { UpdateOwnSupplierDto } from './dto/update-own-supplier.dto';
import { ApiProtectedEndpoint } from '../common/decorators';
import {
	CreateApplicationDto,
	SubmitApplicationDto,
	SupplierApplicationsQueryDto,
	UpdateApplicationDto,
	WithdrawApplicationDto,
} from '../common/dto/application.dto';

@ApiTags('Suppliers')
@ApiBearerAuth('JWT-auth')
@Controller('suppliers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('supplier')
export class SupplierController {
	constructor(private supplierService: SupplierService) {}

	@Get('categories')
	@ApiProtectedEndpoint('List categories', 'Returns all active categories')
	async listCategories() {
		return this.supplierService.listCategories();
	}

	@Get('categories/:categoryId')
	@ApiProtectedEndpoint('Get category details', 'Returns full details of a category')
	async getCategoryById(
		@Param('categoryId') categoryId: string,
		@Req() req: any,
	) {
		const baseUrl = `${req.protocol}://${req.get('host')}`;
		return this.supplierService.getCategoryById(categoryId, baseUrl);
	}

	@Get('categories/:categoryId/template')
	@ApiProtectedEndpoint(
		'Download category template',
		'Downloads the template document attached to the selected category',
	)
	async downloadCategoryTemplate(
		@Param('categoryId') categoryId: string,
		@Res() res: any,
	) {
		const file = await this.supplierService.getCategoryTemplateDocument(categoryId);
		return res.download(file.absolutePath, file.fileName);
	}

	@Get('me')
	@ApiProtectedEndpoint('Get own supplier profile', 'Returns own supplier profile')
	async getOwnProfile(@Request() req: { user: JwtUser }) {
		return this.supplierService.getOwnProfile(req.user.id);
	}

	@Patch('me')
	@ApiProtectedEndpoint('Update own supplier profile', 'Supplier profile updated')
	async updateOwnProfile(
		@Request() req: { user: JwtUser },
		@Body() dto: UpdateOwnSupplierDto,
	) {
		return this.supplierService.updateOwnProfile(req.user.id, dto);
	}
}

@ApiTags('Applications')
@ApiBearerAuth('JWT-auth')
@Controller('applications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('supplier')
export class SupplierApplicationController {
	constructor(private supplierService: SupplierService) {}

	@Post()
	@ApiProtectedEndpoint('Create application', 'Application draft created')
	async createApplication(
		@Request() req: { user: JwtUser },
		@Body() dto: CreateApplicationDto,
	) {
		return this.supplierService.createApplication(req.user.id, dto);
	}

	@Get('me')
	@ApiProtectedEndpoint('My applications', 'Returns supplier applications')
	async listMyApplications(
		@Request() req: { user: JwtUser },
		@Query() query: SupplierApplicationsQueryDto,
	) {
		return this.supplierService.listMyApplications(req.user.id, query);
	}

	@Get(':applicationId/timeline')
	@ApiProtectedEndpoint('Application timeline', 'Returns application status history')
	async getApplicationTimeline(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
	) {
		return this.supplierService.getApplicationTimeline(req.user.id, applicationId);
	}

	@Post(':applicationId/submit')
	@ApiProtectedEndpoint('Submit application', 'Application submitted')
	async submitApplication(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
		@Body() dto: SubmitApplicationDto,
	) {
		return this.supplierService.submitApplication(req.user.id, applicationId, dto);
	}

	@Post(':applicationId/withdraw')
	@ApiProtectedEndpoint('Withdraw application', 'Application withdrawn')
	async withdrawApplication(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
		@Body() dto: WithdrawApplicationDto,
	) {
		return this.supplierService.withdrawApplication(req.user.id, applicationId, dto);
	}

	@Get(':applicationId')
	@ApiProtectedEndpoint('Get application', 'Returns application details')
	async getApplication(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
	) {
		return this.supplierService.getApplication(req.user.id, applicationId);
	}

	@Patch(':applicationId')
	@ApiProtectedEndpoint('Update application', 'Application draft updated')
	async updateApplication(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
		@Body() dto: UpdateApplicationDto,
	) {
		return this.supplierService.updateApplication(req.user.id, applicationId, dto);
	}
}
