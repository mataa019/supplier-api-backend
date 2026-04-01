import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Query,
	Request,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtUser } from '../Auth/jwt/types';
import { Roles, RolesGuard } from '../Auth/jwt/roles';
import { ApiAdminEndpoint, ApiGetByIdEndpoint } from '../common/decorators';
import {
	AdminApplicationsQueryDto,
	RejectApplicationDto,
	ReviewApplicationDto,
	WithdrawApplicationDto,
} from '../supplier/dto/application.dto';
import { AdminApplicationService } from './admin-application.service';

@ApiTags('Admin Applications')
@ApiBearerAuth('JWT-auth')
@Controller('admin/applications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'manager')
export class AdminApplicationController {
	constructor(private adminApplicationService: AdminApplicationService) {}

	@Get()
	@ApiAdminEndpoint('List all applications', 'Returns all applications')
	async listApplications(@Query() query: AdminApplicationsQueryDto) {
		return this.adminApplicationService.listApplications(query);
	}

	@Get(':applicationId')
	@ApiGetByIdEndpoint('Get single application', 'application')
	async getApplication(@Param('applicationId') applicationId: string) {
		return this.adminApplicationService.getApplication(applicationId);
	}

	@Get(':applicationId/documents')
	@ApiAdminEndpoint('View application documents', 'Returns all application documents')
	async getApplicationDocuments(@Param('applicationId') applicationId: string) {
		return this.adminApplicationService.getApplicationDocuments(applicationId);
	}


	@Patch(':applicationId/approve')
	@ApiAdminEndpoint('Approve application', 'Application approved')
	async approveApplication(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
		@Body() dto: ReviewApplicationDto,
	) {
		return this.adminApplicationService.approveApplication(
			applicationId,
			req.user.id,
			req.user.role,
			req.user.email,
			dto,
		);
	}

	@Patch(':applicationId/reject')
	@ApiAdminEndpoint('Reject application', 'Application rejected')
	async rejectApplication(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
		@Body() dto: RejectApplicationDto,
	) {
		return this.adminApplicationService.rejectApplication(
			applicationId,
			req.user.id,
			req.user.role,
			req.user.email,
			dto,
		);
	}

	@Patch(':applicationId/withdraw')
	@ApiAdminEndpoint('Withdraw application', 'Application withdrawn')
	async withdrawApplication(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
		@Body() dto: WithdrawApplicationDto,
	) {
		return this.adminApplicationService.withdrawApplication(
			applicationId,
			req.user.id,
			req.user.role,
			req.user.email,
			dto,
		);
	}
}
