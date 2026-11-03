import { Module } from '@nestjs/common';
import { ContractReviewsController } from './contract-reviews.controller';
import { EmployeeReviewsController } from './employee-reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [ContractReviewsController, EmployeeReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
