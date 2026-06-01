import { Module } from '@nestjs/common';
import { AppReviewsController } from './app-reviews.controller';
import { AppReviewsService } from './app-reviews.service';

@Module({
  controllers: [AppReviewsController],
  providers: [AppReviewsService],
})
export class AppReviewsModule {}
