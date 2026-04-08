import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'General Supplier', description: 'Category name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'For general goods and services suppliers', description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 500.0, description: 'Application fee in ZMW' })
  @IsNumber()
  @Min(0)
  applicationFee: number;

  @ApiProperty({ example: 'Business registration certificate, TPIN certificate, Bank letter', description: 'Requirements for this category' })
  @IsNotEmpty()
  @IsString()
  requirements: string | undefined;

  @ApiPropertyOptional({ enum: ['active', 'inactive'], default: 'active', description: 'Category status' })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';
  

  
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'General Supplier', description: 'Category name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'For general goods and services suppliers', description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 500.0, description: 'Application fee in ZMW' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  applicationFee?: number;

  @ApiPropertyOptional({ example: 'Business registration certificate, TPIN certificate', description: 'Requirements for this category' })
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'], description: 'Category status' })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';

}
