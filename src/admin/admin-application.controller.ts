import { Body, Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../Auth/jwt/roles';
import { JwtUser } from '../Auth/jwt/types';
import { ApiAdminEndpoint, ApiGetByIdEndpoint } from '../common/decorators';
import {
  AdminApplicationsQueryDto,
  RejectApplicationDto,
  ReviewApplicationDto,
} from '../common/dto/application.dto';
import { AdminApplicationService } from './admin-application.service';

@ApiTags('Admin Applications')
@ApiBearerAuth('JWT-auth')
@Controller('admin/applications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'manager')
export class AdminApplicationController {
  constructor(private readonly adminApplicationService: AdminApplicationService) {}

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

  @Patch(':applicationId/under-review')
  @ApiAdminEndpoint('Mark under review', 'Application marked as under review')
  async markUnderReview(
    @Request() req: { user: JwtUser },
    @Param('applicationId') applicationId: string,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.adminApplicationService.markUnderReview(applicationId, req.user.id, dto);
  }

  @Patch(':applicationId/approve')
  @ApiAdminEndpoint('Approve application', 'Application approved')
  async approveApplication(
    @Request() req: { user: JwtUser },
    @Param('applicationId') applicationId: string,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.adminApplicationService.approveApplication(applicationId, req.user.id, dto);
  }

  @Patch(':applicationId/reject')
  @ApiAdminEndpoint('Reject application', 'Application rejected')
  async rejectApplication(
    @Request() req: { user: JwtUser },
    @Param('applicationId') applicationId: string,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.adminApplicationService.rejectApplication(applicationId, req.user.id, dto);
  }
}
