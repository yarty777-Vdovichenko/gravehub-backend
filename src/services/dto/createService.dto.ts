import { IsNotEmpty, IsString, Min, MinLength } from 'class-validator';

export class CreateServiceDto {
  @MinLength(3)
  @IsNotEmpty()
  @IsString()
  name!: string;

  @MinLength(3)
  @IsNotEmpty()
  @IsString()
  description!: string;

  @Min(0)
  price!: number;
}
