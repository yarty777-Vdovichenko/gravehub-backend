import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class SwitchModeDTO {
  @ApiProperty({ enum: ['customer', 'employee'], example: 'employee' })
  @IsIn(['customer', 'employee'])
  mode: 'customer' | 'employee';
}
