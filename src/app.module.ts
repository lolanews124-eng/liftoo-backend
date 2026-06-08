import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { OtpStoreModule } from './otp/otp-store.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AssistantsModule } from './modules/assistants/assistants.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { EarningsModule } from './modules/earnings/earnings.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AppReviewsModule } from './modules/app-reviews/app-reviews.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AdminModule } from './modules/admin/admin.module';
import { SettingsModule } from './modules/settings/settings.module';
import { PromosModule } from './modules/promos/promos.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { SupportModule } from './modules/support/support.module';
import { ChatModule } from './modules/chat/chat.module';
import { UploadModule } from './modules/upload/upload.module';
import { GeocodeModule } from './modules/geocode/geocode.module';
import { HomeFeedAdsModule } from './modules/home-feed-ads/home-feed-ads.module';
import { HomeHeroSlidesModule } from './modules/home-hero-slides/home-hero-slides.module';
import { WebsiteModule } from './modules/website/website.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),
    PrismaModule,
    OtpStoreModule,
    AuthModule,
    UsersModule,
    AssistantsModule,
    CategoriesModule,
    BookingsModule,
    WalletModule,
    ReferralsModule,
    EarningsModule,
    RatingsModule,
    AppReviewsModule,
    NotificationsModule,
    RealtimeModule,
    AdminModule,
    SettingsModule,
    PromosModule,
    PayoutsModule,
    SupportModule,
    ChatModule,
    UploadModule,
    GeocodeModule,
    HomeFeedAdsModule,
    HomeHeroSlidesModule,
    WebsiteModule,
  ],
})
export class AppModule {}
