import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ContractsService } from './contracts.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateContractDto } from './dto/CreateContract.dto';

type AuthRequest = Request & { user: { userId: string; role: string } };

@ApiTags('contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  createContract(@Body() dto: CreateContractDto, @Req() req: AuthRequest) {
    return this.contractsService.create(req.user.userId, dto);
  }

  @Get('my')
  getMine(@Req() req: AuthRequest) {
    return this.contractsService.getMine(req.user.userId);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    return this.contractsService.getById(id, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    return this.contractsService.delete(id, req.user.userId);
  }
}
