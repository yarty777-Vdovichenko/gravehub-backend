// dto/RegisterUser.dto.ts
import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';
import { EmployeeProfileDTO } from './EmployeeProfile.dto';

export class RegisterUserDTO {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

  @IsString()
  name!: string;

  @IsEnum(Role)
  role!: Role;

  @ValidateIf((dto: RegisterUserDTO) => dto.role === 'employee')
  @ValidateNested()
  @Type(() => EmployeeProfileDTO)
  employeeProfile?: EmployeeProfileDTO;
}
