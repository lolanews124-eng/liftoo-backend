import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { GeocodeService } from './geocode.service';

@Controller('api/v1/geocode')
export class GeocodeController {
  constructor(private geocode: GeocodeService) {}

  @Get('reverse')
  reverse(@Query('lat') lat: string, @Query('lng') lng: string) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      throw new BadRequestException('lat and lng are required');
    }
    return this.geocode.reverseGeocode(parsedLat, parsedLng);
  }
}
