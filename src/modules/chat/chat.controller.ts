import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';

class SendMessageDto {
  @IsString() @MinLength(1) message: string;
}

@Controller('api/v1/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chat: ChatService) {}

  @Get('bookings/:bookingId/messages')
  list(@CurrentUser() user: JwtPayload, @Param('bookingId') bookingId: string) {
    return this.chat.listMessages(bookingId, user.sub);
  }

  @Post('bookings/:bookingId/messages')
  send(
    @CurrentUser() user: JwtPayload,
    @Param('bookingId') bookingId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.sendMessage(bookingId, user.sub, dto.message);
  }
}
