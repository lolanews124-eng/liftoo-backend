import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeocodeResult {
  formattedAddress: string;
  locality: string;
  label: string;
  lat: number;
  lng: number;
  placeId?: string;
}

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

@Injectable()
export class GeocodeService {
  private readonly logger = new Logger(GeocodeService.name);

  constructor(private config: ConfigService) {}

  getConfig() {
    const key = this.getApiKey();
    return {
      provider: key ? 'google' : 'nominatim',
      mapsEnabled: Boolean(key),
      autocompleteEnabled: Boolean(key),
      reverseGeocodeEnabled: true,
      /** Clients still need a Maps SDK key in the app for map tiles (Android/iOS/Web). */
      useBackendForSearch: true,
    };
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new BadRequestException('Invalid coordinates');
    }

    const key = this.getApiKey();
    if (key) {
      try {
        return await this.googleReverseGeocode(lat, lng, key);
      } catch (error) {
        this.logger.warn(
          `Google reverse geocode failed, falling back to Nominatim: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    return this.nominatimReverseGeocode(lat, lng);
  }

  async forwardGeocode(address: string): Promise<GeocodeResult> {
    const key = this.getApiKey();
    if (!key) {
      throw new BadRequestException('Address search requires GOOGLE_MAPS_API_KEY');
    }

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address);
    url.searchParams.set('key', key);
    url.searchParams.set('region', 'in');
    url.searchParams.set('components', 'country:IN');

    const data = await this.fetchGoogleJson<{
      status: string;
      results?: Array<{
        formatted_address: string;
        place_id: string;
        geometry: { location: { lat: number; lng: number } };
        address_components: Array<{ long_name: string; types: string[] }>;
      }>;
    }>(url);

    const result = data.results?.[0];
    if (!result) {
      throw new BadRequestException('Address not found');
    }

    return this.toGeocodeResult(
      result.formatted_address,
      result.geometry.location.lat,
      result.geometry.location.lng,
      result.address_components,
      result.place_id,
    );
  }

  async autocomplete(query: string, lat?: number, lng?: number): Promise<PlaceSuggestion[]> {
    const key = this.getApiKey();
    if (!key) {
      throw new BadRequestException('Place search requires GOOGLE_MAPS_API_KEY');
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', query);
    url.searchParams.set('key', key);
    url.searchParams.set('components', 'country:in');
    url.searchParams.set('language', 'en');

    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      url.searchParams.set('location', `${lat},${lng}`);
      url.searchParams.set('radius', '50000');
      url.searchParams.set('strictbounds', 'false');
    }

    const data = await this.fetchGoogleJson<{
      status: string;
      predictions?: Array<{
        place_id: string;
        description: string;
        structured_formatting?: { main_text: string; secondary_text: string };
      }>;
    }>(url);

    return (data.predictions ?? []).map((item) => ({
      placeId: item.place_id,
      description: item.description,
      mainText: item.structured_formatting?.main_text ?? item.description,
      secondaryText: item.structured_formatting?.secondary_text ?? '',
    }));
  }

  async placeDetails(placeId: string): Promise<GeocodeResult> {
    const key = this.getApiKey();
    if (!key) {
      throw new BadRequestException('Place details require GOOGLE_MAPS_API_KEY');
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('key', key);
    url.searchParams.set('fields', 'formatted_address,geometry,name,address_component,place_id');
    url.searchParams.set('language', 'en');

    const data = await this.fetchGoogleJson<{
      status: string;
      result?: {
        formatted_address: string;
        place_id: string;
        name?: string;
        geometry: { location: { lat: number; lng: number } };
        address_components: Array<{ long_name: string; types: string[] }>;
      };
    }>(url);

    const result = data.result;
    if (!result) {
      throw new BadRequestException('Place not found');
    }

    const geocoded = this.toGeocodeResult(
      result.formatted_address,
      result.geometry.location.lat,
      result.geometry.location.lng,
      result.address_components,
      result.place_id,
    );

    if (result.name && !geocoded.label.includes(result.name)) {
      geocoded.label = `${result.name}, ${geocoded.locality}`;
    }

    return geocoded;
  }

  private getApiKey(): string | undefined {
    return this.config.get<string>('GOOGLE_MAPS_API_KEY')?.trim() || undefined;
  }

  private async googleReverseGeocode(
    lat: number,
    lng: number,
    key: string,
  ): Promise<GeocodeResult> {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', key);
    url.searchParams.set('language', 'en');

    const data = await this.fetchGoogleJson<{
      status: string;
      results?: Array<{
        formatted_address: string;
        place_id: string;
        geometry: { location: { lat: number; lng: number } };
        address_components: Array<{ long_name: string; types: string[] }>;
      }>;
    }>(url);

    const result = data.results?.[0];
    if (!result) {
      throw new BadRequestException('Location not found');
    }

    return this.toGeocodeResult(
      result.formatted_address,
      result.geometry.location.lat,
      result.geometry.location.lng,
      result.address_components,
      result.place_id,
    );
  }

  private async nominatimReverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'json');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('zoom', '18');
      url.searchParams.set('addressdetails', '1');

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'Liftoo/1.0 (help@liftoo.in)' },
      });
      if (!res.ok) throw new Error('Geocode failed');
      const data = (await res.json()) as {
        display_name?: string;
        address?: Record<string, string>;
      };

      const addr = data.address ?? {};
      const locality =
        addr.suburb ||
        addr.neighbourhood ||
        addr.city_district ||
        addr.town ||
        addr.city ||
        addr.village ||
        addr.county ||
        'Your area';
      const road = addr.road || addr.pedestrian || addr.retail || '';
      const label = road ? `${road}, ${locality}` : locality;
      const formattedAddress = data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      return { formattedAddress, locality, label, lat, lng };
    } catch {
      return {
        formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        locality: 'Your area',
        label: 'Current location',
        lat,
        lng,
      };
    }
  }

  private toGeocodeResult(
    formattedAddress: string,
    lat: number,
    lng: number,
    components: Array<{ long_name: string; types: string[] }>,
    placeId?: string,
  ): GeocodeResult {
    const pick = (...types: string[]) =>
      components.find((c) => types.some((t) => c.types.includes(t)))?.long_name;

    const locality =
      pick('sublocality_level_1', 'sublocality', 'neighborhood', 'locality', 'administrative_area_level_2') ||
      'Your area';
    const road = pick('route', 'premise', 'establishment') || pick('point_of_interest');
    const label = road ? `${road}, ${locality}` : locality;

    return {
      formattedAddress,
      locality,
      label,
      lat,
      lng,
      placeId,
    };
  }

  private async fetchGoogleJson<T>(url: URL): Promise<T> {
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new BadRequestException('Maps service unavailable');
    }

    const data = (await res.json()) as T & { status?: string; error_message?: string };
    const status = data.status;
    if (status && status !== 'OK' && status !== 'ZERO_RESULTS') {
      this.logger.error(`Google Maps API error: ${status} ${data.error_message ?? ''}`);
      throw new BadRequestException(data.error_message ?? `Maps request failed (${status})`);
    }

    return data;
  }
}
