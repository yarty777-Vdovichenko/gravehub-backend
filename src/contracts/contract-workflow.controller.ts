import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ContractWorkflowService } from './contract-workflow.service';
import { CreateReviewDto } from 'src/reviews/dto/create-review.dto';

type AuthReq = Request & { user: { userId: string; role: string } };

@ApiBearerAuth()
@Controller('customer/contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
export class ContractWorkflowController {
  constructor(private readonly workflow: ContractWorkflowService) {}

  @Post(':id/confirm')
  @HttpCode(200)
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
    @Req() req: AuthReq,
  ) {
    return this.workflow.confirm(id, req.user.userId, dto);
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
