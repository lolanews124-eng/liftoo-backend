import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ReverseGeocodeQueryDto {
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;
}

export class AutocompleteQueryDto {
  @IsString()
  @MinLength(2)
  q: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}

export class PlaceDetailsQueryDto {
  @IsString()
  placeId: string;
}

export class ForwardGeocodeQueryDto {
  @IsString()
  @MinLength(3)
  address: string;
}
