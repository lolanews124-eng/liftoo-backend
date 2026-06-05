import { Controller, Get } from '@nestjs/common';
import { HomeFeedAdsService } from './home-feed-ads.service';

@Controller('api/v1/home-feed')
export class HomeFeedAdsController {
  constructor(private ads: HomeFeedAdsService) {}

  /** Public — active home banner for mobile app. */
  @Get('ad')
  async getActive() {
    const ads = await this.ads.listActiveForApp();
    return { ads, ad: ads[0] ?? null };
  }
}
