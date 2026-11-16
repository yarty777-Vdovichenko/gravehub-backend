import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDate,
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

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  serviceTypeIds!: string[];

  @IsUUID()
  regionId!: string;

  @IsNumber()
  @Min(0)
  positionX!: number;

  @IsNumber()
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
