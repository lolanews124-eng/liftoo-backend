import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  private async assertParticipant(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== userId && booking.assistantId !== userId) {
      throw new ForbiddenException('Not a participant');
    }
    return booking;
  }

  async listMessages(bookingId: string, userId: string) {
    await this.assertParticipant(bookingId, userId);
    return this.prisma.chatMessage.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async sendMessage(bookingId: string, senderId: string, message: string) {
    await this.assertParticipant(bookingId, senderId);
    const trimmed = message.trim();
    if (!trimmed) throw new ForbiddenException('Empty message');

    const msg = await this.prisma.chatMessage.create({
      data: { bookingId, senderId, message: trimmed },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    this.realtime.emitToBooking(bookingId, 'chat:message', msg);
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (booking) {
      const recipientId =
        booking.customerId === senderId ? booking.assistantId : booking.customerId;
      if (recipientId) {
        this.realtime.emitToUser(recipientId, 'chat:message', msg);
      }
    }

    return msg;
  }
}
