import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  IsInt,
} from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({ example: 'cm9abc123xyz', description: 'Category ID' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;
}

export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {}

export class SubmitApplicationDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  declarationAccepted: boolean;
}

export class WithdrawApplicationDto {
  @ApiProperty({ example: 'Submitted in error' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReviewApplicationDto {
  @ApiPropertyOptional({ example: 'Documents are complete' })
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class RejectApplicationDto {
  @ApiProperty({ example: 'Missing mandatory supporting documents' })
  @IsString()
  @IsNotEmpty()
  remarks: string;
}

export class BaseApplicationsQueryDto {
  @ApiPropertyOptional({ example: 'general' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class SupplierApplicationsQueryDto extends BaseApplicationsQueryDto {
  @ApiPropertyOptional({ enum: ['draft', 'submitted'] })
  @IsOptional()
  @IsIn(['draft', 'submitted'])
  status?: 'draft' | 'submitted';
}

export class AdminApplicationsQueryDto extends BaseApplicationsQueryDto {
  @ApiPropertyOptional({ enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn'] })
  @IsOptional()
  @IsIn(['draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn'])
  status?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn';

  @ApiPropertyOptional({ example: 'cm9cat123xyz' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'cm9sup123xyz' })
  @IsOptional()
  @IsString()
  supplierId?: string;
}
