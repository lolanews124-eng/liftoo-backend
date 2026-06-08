import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { WebsiteInquiryStatus } from '@prisma/client';

export class UpdateWebsiteInquiryDto {
  @IsOptional()
  @IsEnum(WebsiteInquiryStatus)
  status?: WebsiteInquiryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
