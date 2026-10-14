import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class createRegionDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name!: string;
}
