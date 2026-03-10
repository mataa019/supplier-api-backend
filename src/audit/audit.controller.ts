import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../Auth/jwt/roles';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';

@ApiTags('Audit')
@ApiBearerAuth('JWT-auth')
@Controller('audit')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private auditService: AuditService) {}

  /** GET /audit — list audit trail entries (with filters & pagination) */
  @Get()
  @ApiOperation({ summary: 'List audit trail entries (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns paginated audit entries' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  async findAll(@Query() query: QueryAuditDto) {
    return this.auditService.findAll(query);
  }

  /** GET /audit/:id — get a single audit entry */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single audit entry by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns the audit entry' })
  @ApiResponse({ status: 404, description: 'Audit entry not found' })
  async findOne(@Param('id') id: string) {
    const entry = await this.auditService.findOne(id);
    if (!entry) {
      throw new NotFoundException('Audit entry not found');
    }
    return entry;
  }
}
