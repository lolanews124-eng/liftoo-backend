import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateContactInquiryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsEmail()
  @MaxLength(160)
  email: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' })
  phone: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;
}
