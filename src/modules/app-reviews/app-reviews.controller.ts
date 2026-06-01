import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AppReviewsService } from './app-reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

class CreateAppReviewDto {
  @IsInt() @Min(1) @Max(5) stars: number;
  @IsOptional() @IsUUID() bookingId?: string;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsString() platform?: string;
}

@Controller('api/v1/app-reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.customer)
export class AppReviewsController {
  constructor(private appReviewsService: AppReviewsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAppReviewDto) {
    return this.appReviewsService.create(user.sub, dto.stars, {
      bookingId: dto.bookingId,
      comment: dto.comment,
      platform: dto.platform,
    });
  }
}
