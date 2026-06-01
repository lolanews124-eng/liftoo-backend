import { Controller, Get } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';

@Controller('api/v1/settings')
export class SettingsController {
  constructor(private settings: PlatformSettingsService) {}

  /** Public read-only platform settings for mobile app pricing display. */
  @Get('public')
  getPublic() {
    return this.settings.get();
  }
}
