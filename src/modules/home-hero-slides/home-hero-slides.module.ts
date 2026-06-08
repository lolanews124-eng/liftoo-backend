import { Module } from '@nestjs/common';
import { HomeHeroSlidesController } from './home-hero-slides.controller';
import { HomeHeroSlidesService } from './home-hero-slides.service';

@Module({
  controllers: [HomeHeroSlidesController],
  providers: [HomeHeroSlidesService],
  exports: [HomeHeroSlidesService],
})
export class HomeHeroSlidesModule {}
