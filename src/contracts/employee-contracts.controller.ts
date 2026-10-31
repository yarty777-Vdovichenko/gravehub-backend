import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PaginationQueryDto } from './dto/PaginationQuery.dto';
import { EmployeeContractsService } from './employee-contracts.service';

type AuthRequest = Request & { user: { userId: string; role: string } };

@ApiTags('employee-contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('employee')
@Controller('employee/contracts')
export class EmployeeContractsController {
  constructor(
    private readonly employeeContractsService: EmployeeContractsService,
  ) {}

  @Get()
  getContracts(@Query() query: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.employeeContractsService.getOpenContractsPaginated(
      query.page,
      query.limit,
      req.user.userId,
    );
  }

  @Get(':id')
  getContract(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    return this.employeeContractsService.getOpenContractById(
      id,
      req.user.userId,
    );
  }
}
