import { ApiProperty } from '@nestjs/swagger';

export class AccessTokenResponseDTO {
  @ApiProperty({ description: 'JWT access токен, живе 15 хвилин' })
  accessToken!: string;
}
