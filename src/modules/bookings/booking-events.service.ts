import { Injectable } from '@nestjs/common';
import { BookingStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

const STATUS_MESSAGES: Partial<Record<BookingStatus, { title: string; body: string; type: NotificationType }>> = {
  searching: {
    title: 'Searching assistant',
    body: 'We are finding the best assistant for you',
    type: NotificationType.new_booking,
  },
  assigned: {
    title: 'Assistant assigned',
    body: 'Your assistant has been assigned',
    type: NotificationType.assistant_assigned,
  },
  arriving: {
    title: 'Assistant arriving',
    body: 'Your assistant is on the way',
    type: NotificationType.assistant_arriving,
  },
  started: {
    title: 'Service started',
    body: 'Your shopping assistance has started',
    type: NotificationType.service_started,
  },
  completed: {
    title: 'Service completed',
    body: 'Your booking has been completed',
    type: NotificationType.payment_completed,
  },
  cancelled: {
    title: 'Booking cancelled',
    body: 'Your booking was cancelled',
    type: NotificationType.booking_cancelled,
  },
};

@Injectable()
export class BookingEventsService {
  constructor(
    private notifications: NotificationsService,
    private realtime: RealtimeGateway,
  ) {}

  async emitBookingUpdate(
    booking: Record<string, unknown> & { id: string; customerId: string; assistantId?: string | null },
    status: BookingStatus,
  ) {
    const msg = STATUS_MESSAGES[status];
    const payload = { booking, status };

    this.realtime.emitToBooking(booking.id, 'booking:updated', payload);
    this.realtime.emitToUser(booking.customerId, 'booking:updated', payload);

    if (booking.assistantId) {
      this.realtime.emitToUser(booking.assistantId, 'booking:updated', payload);
    }

    if (msg) {
      await this.notifications.create(booking.customerId, {
        type: msg.type,
        title: msg.title,
        body: msg.body,
        payload: { bookingId: booking.id, status },
      });

      if (booking.assistantId && status === BookingStatus.searching) {
        await this.notifications.create(booking.assistantId, {
          type: NotificationType.new_booking,
          title: 'New booking request',
          body: 'You have a new nearby booking request',
          payload: { bookingId: booking.id },
        });
      }
    }
  }

  emitBookingRequest(assistantIds: string[], booking: unknown) {
    this.realtime.emitBookingRequest(assistantIds, booking);
  }
}
