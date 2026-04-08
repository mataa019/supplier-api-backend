import { Delete } from '@nestjs/common';
import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,

	Request,
	UploadedFiles,
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
	       ) {
		       return this.supplierApplicationService.listMyApplications(req.user.id);
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
	@ApiBody({
		description: 'Update application category and documents',
		schema: {
			type: 'object',
			properties: {
				categoryId: {
					type: 'string',
					description: 'The new category ID for the application',
					example: 'new-category-id',
				},
				documents: {
					type: 'array',
					description: 'Array of document IDs to attach to the application',
					items: { type: 'string' },
					example: ['docId1', 'docId2', 'docId3'],
				},
			},
			required: ['categoryId', 'documents'],
		},
		examples: {
			default: {
				summary: 'Update category and documents',
				value: {
					categoryId: 'new-category-id',
					documents: ['docId1', 'docId2', 'docId3'],
				},
			},
		},
	})
	async updateApplication(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
		@Body() dto: UpdateApplicationDto,
	) {
		console.log('updateApplication Request:', { userId: req.user.id, applicationId, dto });
		try {
			const result = await this.supplierApplicationService.updateApplication(
				req.user.id,
				applicationId,
				dto,
			);
			console.log('[updateApplication] Success:', result);
			return {
				id: result.id,
				status: result.status,
				category: result.category,
				documents: result.documents,
			};
		} catch (error) {
			console.error('[updateApplication] Error:', error.message, error.stack);
			throw error;
		}
	}

	@Delete(':applicationId')
	@ApiProtectedEndpoint('Delete application', 'Deletes an application if status is draft or withdrawn')
	async deleteApplication(
		@Request() req: { user: JwtUser },
		@Param('applicationId') applicationId: string,
	) {
		return this.supplierApplicationService.deleteApplication(req.user.id, applicationId);
	}
}
