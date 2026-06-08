import { Controller, Get } from '@nestjs/common';

/** Public — use after deploy to confirm the running build has expected routes. */
@Controller('api/v1')
export class HealthController {
  @Get('health')
  check() {
    return {
      ok: true,
      build: '2026-06-05',
      features: [
        'home-hero-slides',
        'home-feed-ads',
        'website-contact',
        'assistant-applications',
      ],
    };
  }
}
