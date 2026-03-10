import { IsOptional, IsString, IsDateString, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditAction, AuditEntity } from '../audit.types';

export class QueryAuditDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsEnum(AuditEntity)
  entity?: AuditEntity;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
