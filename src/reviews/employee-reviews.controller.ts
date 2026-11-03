import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { ListReviewsDto } from './dto/list-reviews.dto';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeeReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get(':id/reviews')
  list(@Param('id', ParseUUIDPipe) id: string, @Query() dto: ListReviewsDto) {
    return this.reviews.listForEmployee(id, dto);
  }
}
