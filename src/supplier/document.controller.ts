import {
	Controller,
	Delete,
	Get,
	Header,
	Param,
	Request,
	Res,
	UseGuards,
	StreamableFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { JwtUser } from '../Auth/jwt/types';
import { Roles, RolesGuard } from '../Auth/jwt/roles';
import { ApiProtectedEndpoint } from '../common/decorators';
import { SupplierApplicationService } from './application.service';

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@Controller('documents')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DocumentController {
	constructor(private supplierApplicationService: SupplierApplicationService) {}

	@Get(':documentId/download')
	@Roles('supplier', 'admin')
	@Header('Content-Type', 'application/octet-stream')
	@ApiProtectedEndpoint('Download document', 'Returns document file')
	async downloadDocument(
		@Request() req: { user: JwtUser },
		@Param('documentId') documentId: string,
		@Res({ passthrough: true }) res: Response,
	) {
		const fileInfo = await this.supplierApplicationService.getDocumentForDownload(
			req.user.id,
			req.user.role,
			documentId,
		);

		res.setHeader(
			'Content-Disposition',
			`attachment; filename="${fileInfo.fileName}"`,
		);

		return new StreamableFile(createReadStream(fileInfo.absolutePath));
	}

	@Delete(':documentId')
	@Roles('supplier')
	@ApiProtectedEndpoint('Delete document', 'Document deleted')
	async deleteDocument(
		@Request() req: { user: JwtUser },
		@Param('documentId') documentId: string,
	) {
		return this.supplierApplicationService.deleteDocument(req.user.id, documentId);
	}
}
