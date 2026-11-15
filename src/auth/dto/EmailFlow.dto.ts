import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyEmailDTO {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;
}

export class ForgotPasswordDTO {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDTO {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
