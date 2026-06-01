import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsNumber, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { PromosService } from './promos.service';

class ValidatePromoDto {
  @IsString() code: string;
  @IsNumber() orderAmount: number;
}

class ApplyPromoDto {
  @IsString() @MinLength(2) code: string;
}

@Controller('api/v1/promos')
export class PromosController {
  constructor(private promos: PromosService) {}

  @Post('validate')
  validate(@Body() dto: ValidatePromoDto) {
    return this.promos.validate(dto.code, dto.orderAmount);
  }

  @Post('bookings/:bookingId/apply')
  @UseGuards(JwtAuthGuard)
  apply(
    @CurrentUser() user: JwtPayload,
    @Param('bookingId') bookingId: string,
    @Body() dto: ApplyPromoDto,
  ) {
    return this.promos.applyToBooking(bookingId, dto.code, user.sub);
  }
}
