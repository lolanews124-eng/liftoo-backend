import { AssistantApplicationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAssistantApplicationDto {
  @IsOptional()
  @IsEnum(AssistantApplicationStatus)
  status?: AssistantApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
