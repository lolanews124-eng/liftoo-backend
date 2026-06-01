import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { IsString } from 'class-validator';

class ApplyReferralDto {
  @IsString() code: string;
}

@Controller('api/v1/referrals')
export class ReferralsController {
  constructor(private referralsService: ReferralsService) {}

  @Get('validate/:code')
  validate(@Param('code') code: string) {
    return this.referralsService.validateReferralCode(code);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getInfo(@CurrentUser() user: JwtPayload) {
    return this.referralsService.getReferralInfo(user.sub);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  apply(@CurrentUser() user: JwtPayload, @Body() dto: ApplyReferralDto) {
    return this.referralsService.applyReferralCode(user.sub, dto.code);
  }
}
