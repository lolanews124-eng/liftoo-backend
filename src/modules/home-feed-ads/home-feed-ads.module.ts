import { Module } from '@nestjs/common';
import { HomeFeedAdsController } from './home-feed-ads.controller';
import { HomeFeedAdsService } from './home-feed-ads.service';

@Module({
  controllers: [HomeFeedAdsController],
  providers: [HomeFeedAdsService],
  exports: [HomeFeedAdsService],
})
export class HomeFeedAdsModule {}
