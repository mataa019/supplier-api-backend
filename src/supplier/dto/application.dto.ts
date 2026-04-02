import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  IsArray,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApplicationDto {
  @ApiProperty({ example: 'cm9abc123xyz', description: 'Category ID' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;
}


export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {
  @ApiPropertyOptional({ type: [String], description: 'Array of document IDs to attach to the application' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];
}

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

export class UploadApplicationDocumentItemDto {
  @ApiProperty({
    enum: [
      'business_registration',
      'tax_certificate',
      'bank_letter',
      'insurance',
      'other',
    ],
  })
  @IsString()
  @IsIn([
    'business_registration',
    'tax_certificate',
    'bank_letter',
    'insurance',
    'other',
  ])
  type:
    | 'business_registration'
    | 'tax_certificate'
    | 'bank_letter'
    | 'insurance'
    | 'other';

  @ApiPropertyOptional({ example: 'Updated tax certificate' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UploadApplicationDocumentDto {
  @ApiProperty({ type: [UploadApplicationDocumentItemDto] })
  @IsNotEmpty()
  documents: UploadApplicationDocumentItemDto[];
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
   @ApiPropertyOptional({example: 'General Supplier' })
  @IsOptional()
  @IsString()
  search?: string; // Keyword to search in remarks, category name, or supplier company name. Omit to see all.

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number; // Page number for pagination (default: 1)

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number; // Number of items per page (default: 10)
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
  status?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn'; // Filter by application status. Omit to include all statuses.

  @ApiPropertyOptional({ example: 'cm9cat123xyz' })
  @IsOptional()
  @IsString()
  categoryId?: string; // Filter by category ID. Omit to include all categories.

  @ApiPropertyOptional({ example: 'cm9sup123xyz' })
  @IsOptional()
  @IsString()
  supplierId?: string; // Filter by supplier ID. Omit to include all suppliers.
}
