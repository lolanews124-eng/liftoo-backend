import { VerificationDocType, VerificationStatus } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitVerificationDto {
  @IsEnum(VerificationDocType)
  type: VerificationDocType;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  textValue?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ReviewVerificationDto {
  @IsString()
  userId: string;

  @IsEnum(VerificationDocType)
  type: VerificationDocType;

  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @IsOptional()
  @IsString()
  adminNote?: string;

  @IsOptional()
  @IsString()
  verifiedBy?: string;
}
