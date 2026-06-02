import {
  BookingStatus,
  UserRole,
  VerificationDocType,
  VerificationStatus,
} from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class AdminBookingsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  /** completed bookings awaiting customer payment */
  @IsOptional()
  paymentPending?: string;
}

export class AdminVerificationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isSuspended?: boolean;

  @IsOptional()
  roles?: UserRole[];
}

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateCategoryDto {
  @IsString()
  slug: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseRate: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseRate?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  assistantPayoutPercent?: number;
}

export class CreateCityDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminReviewVerificationDto {
  @IsString()
  userId: string;

  @IsEnum(VerificationDocType)
  type: VerificationDocType;

  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  matchRadiusKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  signupWalletBonus?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  referralRewardAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  assistantEarningPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  matchBatchSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  platformFeePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bookingSearchTimeoutMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cancellationFreeBeforeMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cancellationFeePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minCancellationFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAssistantSettlementBalance?: number;
}

export class VerifyAssistantDto {
  @IsBoolean()
  verified: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreatePromoDto {
  @IsString()
  code: string;

  @IsString()
  discountType: 'fixed' | 'percent';

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxUses?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class ProcessPayoutDto {
  @IsString()
  status: 'approved' | 'rejected' | 'paid';

  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class UpdateSupportTicketDto {
  @IsOptional()
  @IsString()
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';

  @IsOptional()
  @IsString()
  adminReply?: string;
}
