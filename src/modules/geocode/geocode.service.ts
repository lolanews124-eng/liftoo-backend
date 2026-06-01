import { BadRequestException, Injectable } from '@nestjs/common';

export interface ReverseGeocodeResult {
  formattedAddress: string;
  locality: string;
  label: string;
  lat: number;
  lng: number;
}

@Injectable()
export class GeocodeService {
  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new BadRequestException('Invalid coordinates');
    }

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
}
