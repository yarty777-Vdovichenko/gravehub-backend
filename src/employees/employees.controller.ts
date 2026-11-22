import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { EmployeesQueryDto } from './dto/employees-query.dto';
import { EmployeesService } from './employees.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  search(
    @Query() query: EmployeesQueryDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.employeesService.search(query, req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }
}
