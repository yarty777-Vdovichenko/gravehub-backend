import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinDate,
} from 'class-validator';

export class CreateContractDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @IsUUID()
  serviceTypeId!: string;

  @IsUUID()
  regionId!: string;

  @IsInt()
  @Min(0)
  positionX!: number;

  @IsInt()
  @Min(0)
  positionY!: number;

  @Type(() => Date)
  @IsDate()
  @MinDate(() => new Date())
  date!: Date;

  @IsNumber()
  @IsPositive()
  budget!: number;
}
