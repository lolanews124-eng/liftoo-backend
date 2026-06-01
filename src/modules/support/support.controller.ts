import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { SupportService } from './support.service';

class CreateTicketDto {
  @IsString() @MinLength(3) subject: string;
  @IsString() @MinLength(10) message: string;
  @IsOptional() @IsString() bookingId?: string;
}

@Controller('api/v1/support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private support: SupportService) {}

  @Post('tickets')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTicketDto) {
    return this.support.create(user.sub, dto);
  }

  @Get('tickets')
  list(@CurrentUser() user: JwtPayload) {
    return this.support.listForUser(user.sub);
  }

  @Get('tickets/:id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.support.getForUser(user.sub, id);
  }
}
