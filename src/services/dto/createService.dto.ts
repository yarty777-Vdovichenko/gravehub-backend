import { IsNotEmpty, Min, MinLength } from 'class-validator';

export class CreateServiceDto {
  @MinLength(3)
  @IsNotEmpty()
  name!: string;

  @MinLength(3)
  @IsNotEmpty()
  description!: string;

  @Min(0)
  price!: number;
}
