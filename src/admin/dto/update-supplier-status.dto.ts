import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateSupplierStatusDto {
  @ApiProperty({ enum: ['pending', 'active', 'suspended'], example: 'active' })
  @IsIn(['pending', 'active', 'suspended'])
  status: 'pending' | 'active' | 'suspended';
}
