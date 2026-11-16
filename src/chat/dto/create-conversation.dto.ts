import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    format: 'uuid',
    description: 'EmployeeProfile ID, not the employee user ID',
  })
  @IsUUID()
  employeeProfileId!: string;
}
