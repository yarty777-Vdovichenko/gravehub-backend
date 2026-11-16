import {
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateEmployeeProfileDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(6)
  @MaxLength(2000)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  specializationIds?: string[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  regionIds?: string[];
}
