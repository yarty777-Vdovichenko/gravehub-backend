import { Module } from '@nestjs/common';
import { EmployeeReviewsController } from './employee-reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [EmployeeReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
