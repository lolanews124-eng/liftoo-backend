import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RatingsService } from './ratings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

class CreateRatingDto {
  @IsUUID() bookingId: string;
  @IsInt() @Min(1) @Max(5) stars: number;
  @IsOptional() @IsString() comment?: string;
}

@Controller('api/v1/ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.customer)
export class RatingsController {
  constructor(private ratingsService: RatingsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRatingDto) {
    return this.ratingsService.create(
      user.sub,
      dto.bookingId,
      dto.stars,
      dto.comment,
    );
  }
}
