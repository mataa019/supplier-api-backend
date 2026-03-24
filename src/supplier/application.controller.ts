import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Request,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtUser } from '../Auth/jwt/types';
import { Roles, RolesGuard } from '../Auth/jwt/roles';
import { ApiProtectedEndpoint } from '../common/decorators';
import {
	CreateApplicationDto,
	SubmitApplicationDto,
	SupplierApplicationsQueryDto,
	UploadApplicationDocumentDto,
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

	@Post(':applicationId/withdraw')
	@ApiProtectedEndpoint('Withdraw application', 'Application withdrawn')
	async withdrawApplication(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
		@Body() dto: WithdrawApplicationDto,
	) {
		return this.supplierApplicationService.withdrawApplication(
			req.user.id,
			applicationId,
			dto,
		);
	}

	@Post(':applicationId/documents')
	@UseInterceptors(FilesInterceptor('files'))
	@ApiConsumes('multipart/form-data')
	@ApiProtectedEndpoint('Upload application documents', 'Documents uploaded')
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				documents: {
					type: 'string',
					description: 'JSON stringified array of document metadata (type, description)',
					example: '[{"type":"tax_certificate","description":"Updated tax certificate"}]',
				},
				files: {
					type: 'array',
					items: { type: 'string', format: 'binary' },
				},
			},
			required: ['documents', 'files'],
		},
	})
	async uploadApplicationDocuments(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
		@Body() body: any,
		@UploadedFiles() files: any[],
	) {
		// Parse documents metadata from body
		const documents = JSON.parse(body.documents);
		return this.supplierApplicationService.uploadApplicationDocuments(
			req.user.id,
			applicationId,
			documents,
			files,
		);
	}

	@Get(':applicationId/documents')
	@ApiProtectedEndpoint('List application documents', 'Returns uploaded documents')
	async listApplicationDocuments(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
	) {
		return this.supplierApplicationService.listApplicationDocuments(
			req.user.id,
			applicationId,
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
