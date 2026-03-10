import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../Auth/jwt/roles';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { ApiAdminEndpoint, ApiGetByIdEndpoint } from '../common/decorators';

@ApiTags('Audit')
@ApiBearerAuth('JWT-auth')
@Controller('audit')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private auditService: AuditService) {}

  /** GET /audit — list audit trail entries (with filters & pagination) */
  @Get()
  @ApiAdminEndpoint('List audit trail entries', 'Returns paginated audit entries')
  async findAll(@Query() query: QueryAuditDto) {
    return this.auditService.findAll(query);
  }

  /** GET /audit/:id — get a single audit entry */
  @Get(':id')
  @ApiGetByIdEndpoint('Get audit entry by ID', 'Audit entry')
  async findOne(@Param('id') id: string) {
    const entry = await this.auditService.findOne(id);
    if (!entry) {
      throw new NotFoundException('Audit entry not found');
    }
    return entry;
  }
}
