import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Request,
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

	@Get('categories/:categoryId/form-template')
	@ApiProtectedEndpoint(
		'Get category form template',
		'Returns the online form template assigned to a category',
	)
	async getCategoryFormTemplate(@Param('categoryId') categoryId: string) {
		return this.supplierService.getCategoryFormTemplate(categoryId);
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
