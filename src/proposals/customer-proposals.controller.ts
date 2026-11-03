import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ProposalsService } from './proposals.service';
import { ListProposalsDto } from './dto/list-proposals.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

type AuthReq = Request & { user: { userId: string; role: string } };

@ApiBearerAuth()
@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
export class CustomerProposalsController {
  constructor(private readonly proposals: ProposalsService) {}
  @Post(':contractId/proposals/:id/accept')
  accept(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Param('id', ParseUUIDPipe) proposalId: string,
    @Req() req: AuthReq,
  ) {
    return this.proposals.accept(contractId, proposalId, req.user.userId);
  }

  @Post(':contractId/proposals/:id/reject')
  reject(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Param('id', ParseUUIDPipe) proposalId: string,
    @Req() req: AuthReq,
  ) {
    return this.proposals.reject(contractId, proposalId, req.user.userId);
  }

  @Get(':id/proposals')
  list(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() dto: ListProposalsDto,
    @Req() req: AuthReq,
  ) {
    return this.proposals.listForContract(id, req.user.userId, dto);
  }
}
