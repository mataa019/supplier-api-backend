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
import { Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { createReadStream, promises as fsPromises } from 'fs';
import { join } from 'path';


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

	@Get(':applicationId/documents/:documentId/download')
	@ApiAdminEndpoint('Download application document', 'Downloads a specific application document')
	async downloadApplicationDocument(
		@Param('applicationId') applicationId: string,
		@Param('documentId') documentId: string,
		@Res() res: Response,
	) {
		// Find the document and check it belongs to the application
		const document = await this.adminApplicationService.getDocumentForDownload(applicationId, documentId);
		if (!document) {
			throw new NotFoundException('Document not found');
		}
		return res.download(document.absolutePath, document.fileName);
	}

	@Get(':applicationId/merge-documents')
	@ApiAdminEndpoint('Download merged application documents', 'Downloads all application PDF documents merged into a single PDF')
	async downloadMergedDocuments(
		@Param('applicationId') applicationId: string,
		@Res() res: Response,
	) {
		// Get application with supplier and category info
		const application = await this.adminApplicationService.getApplication(applicationId);
		if (!application) throw new NotFoundException('Application not found');

		// Get all PDF documents for this application
		const documents = await this.adminApplicationService.getApplicationDocuments(applicationId);
		const pdfDocs = documents.filter((doc: any) => doc.fileName.toLowerCase().endsWith('.pdf'));
		if (pdfDocs.length === 0) throw new NotFoundException('No PDF documents found for this application');

		// Read all PDF files as Uint8Array
		const pdfBuffers = await Promise.all(
			pdfDocs.map(async (doc: any) => {
				const absPath = doc.filePath.startsWith('uploads') ?
					join(process.cwd(), doc.filePath) :
					join(process.cwd(), 'uploads', 'application-documents', doc.filePath);
				return fsPromises.readFile(absPath);
			})
		);

		// Merge PDFs using pdf-lib
		const mergedPdf = await PDFDocument.create();

		// Add supplier details page first
		const supplier = application.supplier;
		if (supplier) {
			const detailsPdf = await PDFDocument.create();
			const page = detailsPdf.addPage([595.28, 841.89]); // A4 size in points
			const { width, height } = page.getSize();
			const font = await detailsPdf.embedFont(StandardFonts.Helvetica);
			const fontSize = 14;
			let y = height - 50;
			const lineHeight = 22;
			const details = [
				`Company Name: ${supplier.companyName}`,
				`Email: ${supplier.user?.email || ''}`,
				`Address: ${supplier.address || ''}`,
				`Contact Person: ${supplier.contactPerson || ''}`,
				`Phone: ${supplier.phone || ''}`,
				`TPIN: ${supplier.tpin || ''}`,
				`Registration Number: ${supplier.registrationNumber || ''}`,
				`Status: ${supplier.status || ''}`,
				`Created At: ${supplier.createdAt}`,
				`Updated At: ${supplier.updatedAt}`,
			];
			details.forEach(line => {
				page.drawText(line, { x: 50, y, size: fontSize, font });
				y -= lineHeight;
			});
			const detailsBytes = await detailsPdf.save();
			const detailsDoc = await PDFDocument.load(detailsBytes);
			const detailsPages = await mergedPdf.copyPages(detailsDoc, detailsDoc.getPageIndices());
			detailsPages.forEach(page => mergedPdf.addPage(page));
		}

		// Add all application PDFs
		for (const pdfBytes of pdfBuffers) {
			const pdf = await PDFDocument.load(pdfBytes);
			const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
			copiedPages.forEach(page => mergedPdf.addPage(page));
		}
		const mergedPdfBytes = await mergedPdf.save();

		// Set filename to CompanyName - CategoryName.pdf
		const companyName = application.supplier?.companyName || 'Company';
		const categoryName = application.category?.name || 'Category';
		const safeCompany = companyName.replace(/[^a-zA-Z0-9 _-]/g, '_');
		const safeCategory = categoryName.replace(/[^a-zA-Z0-9 _-]/g, '_');
		const filename = `${safeCompany} - ${safeCategory}.pdf`;

		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		return res.end(Buffer.from(mergedPdfBytes));
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
