import { IsArray, IsNotEmpty, IsUUID, MinLength } from 'class-validator';

export class EmployeeProfileDTO {
  @IsArray()
  @IsUUID('4', { each: true })
  specializationIds!: string[];

  @IsNotEmpty()
  @MinLength(6)
  description!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  regionIds!: string[];
}
