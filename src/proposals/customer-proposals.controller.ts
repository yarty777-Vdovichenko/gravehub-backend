import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ProposalsService } from './proposals.service';
import { ListProposalsDto } from './dto/list-proposals.dto';

type AuthReq = Request & { user: { userId: string; role: string } };

@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
export class ContractProposalsController {
  constructor(private readonly proposals: ProposalsService) {}

  @Get(':id/proposals')
  list(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() dto: ListProposalsDto,
    @Req() req: AuthReq,
  ) {
    return this.proposals.listForContract(id, req.user.userId, dto);
  }
}
