import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export const CONTRACT_SORT_FIELDS = ['budget', 'createdAt'] as const;
export type ContractSortField = (typeof CONTRACT_SORT_FIELDS)[number];

export class ContractsQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minBudget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxBudget?: number;

  @IsOptional()
  @IsIn(CONTRACT_SORT_FIELDS)
  sortBy: ContractSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
