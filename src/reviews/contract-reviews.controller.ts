import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

type AuthReq = Request & { user: { userId: string; role: string } };

@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
export class ContractReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post(':id/review')
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
    @Req() req: AuthReq,
  ) {
    return this.reviews.create(id, req.user.userId, dto);
  }
}
