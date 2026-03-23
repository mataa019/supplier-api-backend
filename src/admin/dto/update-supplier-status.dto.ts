import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateSupplierStatusDto {
  @ApiProperty({ enum: ['active', 'suspended'], example: 'active' })
  @IsIn(['active', 'suspended'])
  status: 'active' | 'suspended';
}
