import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { IsNumber, Min } from 'class-validator';

class TopUpDto {
  @IsNumber() @Min(1) amount: number;
}

@Controller('api/v1/wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  getWallet(@CurrentUser() user: JwtPayload) {
    return this.walletService.getWallet(user.sub);
  }

  @Post('top-up')
  topUp(@CurrentUser() user: JwtPayload, @Body() dto: TopUpDto) {
    return this.walletService.topUp(user.sub, dto.amount);
  }
}
