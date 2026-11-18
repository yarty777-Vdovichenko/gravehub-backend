import { Type } from 'class-transformer';
import { ContractLocationType } from '@prisma/client';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinDate,
  ValidateIf,
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

  @IsOptional()
  @IsEnum(ContractLocationType)
  locationType?: ContractLocationType;

  @ValidateIf(
    (dto) =>
      dto.locationType === undefined ||
      dto.locationType === ContractLocationType.coordinates,
  )
  @IsNumber()
  @Min(0)
  positionX?: number;

  @ValidateIf(
    (dto) =>
      dto.locationType === undefined ||
      dto.locationType === ContractLocationType.coordinates,
  )
  @IsNumber()
  @Min(0)
  positionY?: number;

  @ValidateIf(
    (dto) => dto.locationType === ContractLocationType.burial_plot,
  )
  @IsUUID()
  burialPlotId?: string;

  @ValidateIf((dto) => dto.locationType === ContractLocationType.address)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address?: string;

  @Type(() => Date)
  @IsDate()
  @MinDate(() => new Date())
  date!: Date;

  @IsNumber()
  @IsPositive()
  budget!: number;
}
