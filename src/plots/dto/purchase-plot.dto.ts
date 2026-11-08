import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { CREDIT_TERMS } from '../credit';

export class CreditPreviewDto {
  @Type(() => Number)
  @IsIn(CREDIT_TERMS)
  months!: (typeof CREDIT_TERMS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  downPayment: number = 0;
}

export class PurchasePlotDto {
  @IsIn(['full', 'credit'])
  paymentType!: 'full' | 'credit';

  @IsOptional()
  @IsIn(CREDIT_TERMS)
  months?: (typeof CREDIT_TERMS)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  downPayment?: number;
}
