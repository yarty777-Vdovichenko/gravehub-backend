import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeeProfileController } from './employee-profile.controller';
import { CloudinaryService } from './cloudinary.service';

@Module({
  controllers: [EmployeesController, EmployeeProfileController],
  providers: [EmployeesService, CloudinaryService],
})
export class EmployeesModule {}
