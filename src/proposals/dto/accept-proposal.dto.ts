import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ContractSpecificationDto {
  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AcceptProposalDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractSpecificationDto)
  selections?: ContractSpecificationDto[];
}
