import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class EstimateContractPriceDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  serviceTypeIds!: string[];
}
