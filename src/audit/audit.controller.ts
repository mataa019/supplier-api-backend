import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from '../Auth/jwt/roles';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';

@Controller('audit')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private auditService: AuditService) {}

  /** GET /audit — list audit trail entries (with filters & pagination) */
  @Get()
  async findAll(@Query() query: QueryAuditDto) {
    return this.auditService.findAll(query);
  }

  /** GET /audit/:id — get a single audit entry */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entry = await this.auditService.findOne(id);
    if (!entry) {
      throw new NotFoundException('Audit entry not found');
    }
    return entry;
  }
}
