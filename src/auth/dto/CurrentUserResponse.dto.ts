import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CurrentUserResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: Role, isArray: true })
  roles!: Role[];

  @ApiProperty({ enum: Role })
  mode!: Role;
}
