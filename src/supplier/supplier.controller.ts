import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
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


	@Patch('me')
	@ApiProtectedEndpoint('Update own supplier profile', 'Supplier profile updated')
	async updateOwnProfile(
		@Request() req: { user: JwtUser },
		@Body() dto: UpdateOwnSupplierDto,
	) {
		return this.supplierService.updateOwnProfile(req.user.id, dto);
	}
}
