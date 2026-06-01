import { Controller, Get, Query } from '@nestjs/common';
import { GeocodeService } from './geocode.service';
import {
  AutocompleteQueryDto,
  ForwardGeocodeQueryDto,
  PlaceDetailsQueryDto,
  ReverseGeocodeQueryDto,
} from './geocode.dto';

@Controller('api/v1/geocode')
export class GeocodeController {
  constructor(private geocode: GeocodeService) {}

  /** Public — lets clients know maps/search is available. */
  @Get('config')
  config() {
    return this.geocode.getConfig();
  }

  /** Convert GPS coordinates to a human-readable address. */
  @Get('reverse')
  reverse(@Query() query: ReverseGeocodeQueryDto) {
    return this.geocode.reverseGeocode(query.lat, query.lng);
  }

  /** Address/place search suggestions (Google Places Autocomplete). */
  @Get('autocomplete')
  autocomplete(@Query() query: AutocompleteQueryDto) {
    return this.geocode.autocomplete(query.q, query.lat, query.lng);
  }

  /** Resolve a Google place ID to lat/lng + formatted address. */
  @Get('place')
  place(@Query() query: PlaceDetailsQueryDto) {
    return this.geocode.placeDetails(query.placeId);
  }

  /** Convert a typed address string to coordinates. */
  @Get('forward')
  forward(@Query() query: ForwardGeocodeQueryDto) {
    return this.geocode.forwardGeocode(query.address);
  }
}
