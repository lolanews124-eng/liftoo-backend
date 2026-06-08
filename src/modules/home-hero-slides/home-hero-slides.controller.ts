import { Controller, Get } from '@nestjs/common';
import { HomeHeroSlidesService } from './home-hero-slides.service';

@Controller('api/v1/home-hero')
export class HomeHeroSlidesController {
  constructor(private slides: HomeHeroSlidesService) {}

  /** Public — active hero carousel slides for customer home. */
  @Get('slides')
  async listActive() {
    const slides = await this.slides.listActiveForApp();
    return { slides };
  }
}
