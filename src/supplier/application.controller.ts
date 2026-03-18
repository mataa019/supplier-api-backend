import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Request,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtUser } from '../Auth/jwt/types';
import { Roles, RolesGuard } from '../Auth/jwt/roles';
import { ApiProtectedEndpoint } from '../common/decorators';
import {
	CreateApplicationDto,
	SubmitApplicationDto,
	SupplierApplicationsQueryDto,
	UpdateApplicationDto,
	WithdrawApplicationDto,
} from './dto/application.dto';
import { SupplierApplicationService } from './application.service';

@ApiTags('Applications')
@ApiBearerAuth('JWT-auth')
@Controller('applications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('supplier')
export class SupplierApplicationController {
	constructor(private supplierApplicationService: SupplierApplicationService) {}

	@Post()
	@ApiProtectedEndpoint('Create application', 'Application draft created')
	async createApplication(
		@Request() req: { user: JwtUser },
		@Body() dto: CreateApplicationDto,
	) {
		return this.supplierApplicationService.createApplication(req.user.id, dto);
	}

	@Get('me')
	@ApiProtectedEndpoint('My applications', 'Returns supplier applications')
	async listMyApplications(
		@Request() req: { user: JwtUser },
		@Query() query: SupplierApplicationsQueryDto,
	) {
		return this.supplierApplicationService.listMyApplications(req.user.id, query);
	}

	@Get(':applicationId/timeline')
	@ApiProtectedEndpoint('Application timeline', 'Returns application status history')
	async getApplicationTimeline(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
	) {
		return this.supplierApplicationService.getApplicationTimeline(
			req.user.id,
			applicationId,
		);
	}

	@Post(':applicationId/submit')
	@ApiProtectedEndpoint('Submit application', 'Application submitted')
	async submitApplication(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
		@Body() dto: SubmitApplicationDto,
	) {
		return this.supplierApplicationService.submitApplication(
			req.user.id,
			applicationId,
			dto,
		);
	}


	@Get(':applicationId')
	@ApiProtectedEndpoint('Get application', 'Returns application details')
	async getApplication(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
	) {
		return this.supplierApplicationService.getApplication(
			req.user.id,
			applicationId,
		);
	}

	@Patch(':applicationId')
	@ApiProtectedEndpoint('Update application', 'Application draft updated')
	async updateApplication(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
		@Body() dto: UpdateApplicationDto,
	) {
		return this.supplierApplicationService.updateApplication(
			req.user.id,
			applicationId,
			dto,
		);
	}
}
