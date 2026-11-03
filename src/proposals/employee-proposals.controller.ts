import {
  Body,
  Controller,
  Delete,
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
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { ListProposalsDto } from './dto/list-proposals.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

type AuthReq = Request & { user: { userId: string; role: string } };

@Controller('employee')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('employee')
export class EmployeeProposalsController {
  constructor(private readonly proposals: ProposalsService) {}

  @Post('contracts/:contractId/proposals')
  propose(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Body() dto: CreateProposalDto,
    @Req() req: AuthReq,
  ) {
    return this.proposals.propose(contractId, req.user.userId, dto);
  }

  @Get('proposals')
  listMy(@Query() dto: ListProposalsDto, @Req() req: AuthReq) {
    return this.proposals.listMy(req.user.userId, dto);
  }

  @Delete('proposals/:id')
  @HttpCode(204)
  cancel(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthReq) {
    return this.proposals.cancel(id, req.user.userId);
  }
}
