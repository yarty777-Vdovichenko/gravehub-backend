import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateProposalDto {
  @IsInt()
  @Min(1)
  price!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment!: string;
}
