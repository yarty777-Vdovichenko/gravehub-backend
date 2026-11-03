import {
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ContractWorkflowService } from './contract-workflow.service';
import type { Request } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';

type AuthReq = Request & { user: { userId: string; role: string } };

@ApiBearerAuth()
@Controller('customer/contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
export class ContractWorkflowController {
  constructor(private readonly workflow: ContractWorkflowService) {}

  @Post(':id/confirm')
  @HttpCode(200)
  confirm(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthReq) {
    return this.workflow.confirm(id, req.user.userId);
  }

  @Post(':id/reject-completion')
  @HttpCode(200)
  rejectCompletion(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthReq,
  ) {
    return this.workflow.rejectCompletion(id, req.user.userId);
  }
}
