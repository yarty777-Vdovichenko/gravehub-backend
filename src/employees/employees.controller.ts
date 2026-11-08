import { Controller, Get, Param, Query } from '@nestjs/common';
import { EmployeesQueryDto } from './dto/employees-query.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  search(@Query() query: EmployeesQueryDto) {
    return this.employeesService.search(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }
}
