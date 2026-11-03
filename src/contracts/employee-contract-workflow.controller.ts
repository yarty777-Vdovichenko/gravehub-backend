import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ContractWorkflowService } from './contract-workflow.service';
import { ListMyContractsDto } from './dto/list-my-contracts.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

type AuthReq = Request & { user: { userId: string; role: string } };

@ApiBearerAuth()
@Controller('employee/my-contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('employee')
export class EmployeeContractWorkflowController {
  constructor(private readonly workflow: ContractWorkflowService) {}

  @Get('my')
  listMy(@Query() dto: ListMyContractsDto, @Req() req: AuthReq) {
    return this.workflow.listMy(req.user.userId, dto);
  }

  @Post(':id/complete')
  @HttpCode(200)
  complete(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthReq) {
    return this.workflow.complete(id, req.user.userId);
  }
}
