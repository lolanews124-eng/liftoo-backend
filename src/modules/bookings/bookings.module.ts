import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingEventsService } from './booking-events.service';
import { CategoriesModule } from '../categories/categories.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WalletModule } from '../wallet/wallet.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { EarningsModule } from '../earnings/earnings.module';

@Module({
  imports: [
    CategoriesModule,
    NotificationsModule,
    RealtimeModule,
    WalletModule,
    ReferralsModule,
    EarningsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingEventsService],
  exports: [BookingsService],
})
export class BookingsModule {}
