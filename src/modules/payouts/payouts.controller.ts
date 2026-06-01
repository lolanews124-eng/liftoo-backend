import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { PayoutsService } from './payouts.service';

class RequestPayoutDto {
  @IsNumber() @Min(1) amount: number;
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() ifscCode?: string;
}

@Controller('api/v1/payouts')
@UseGuards(JwtAuthGuard)
export class PayoutsController {
  constructor(private payouts: PayoutsService) {}

  @Get('balance')
  balance(@CurrentUser() user: JwtPayload) {
    return this.payouts.getAvailableBalance(user.sub);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.payouts.listForAssistant(user.sub);
  }

  @Post('request')
  request(@CurrentUser() user: JwtPayload, @Body() dto: RequestPayoutDto) {
    return this.payouts.requestPayout(user.sub, dto);
  }
}
