import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateBookingDto {
  @IsUUID()
  categoryId: string;

  @IsInt()
  @Min(30)
  durationMin: number;

  @IsString()
  venueName: string;

  @IsDateString()
  scheduledAt: string;

  @IsString()
  addressLabel: string;

  @IsString()
  addressFormatted: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsUUID()
  cityId?: string;
}

export class VerifyOtpDto {
  @IsString()
  otp: string;
}

export class PayBookingDto {
  @IsString()
  method: PaymentMethod;
}

export class RejectBookingDto {
  @IsString()
  @MinLength(3)
  reason: string;
}

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ConfirmCashPaymentDto {
  @IsString()
  otp: string;
}
