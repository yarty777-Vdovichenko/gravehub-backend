import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  MinLength,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class CreateServiceDto {
  @MinLength(3)
  @IsNotEmpty()
  @IsString()
  name!: string;

  @MinLength(3)
  @IsNotEmpty()
  @IsString()
  description!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Min(0)
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
