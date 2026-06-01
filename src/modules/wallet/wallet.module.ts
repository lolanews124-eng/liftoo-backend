import { Module, forwardRef } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [WalletController],
  providers: [WalletService, PaymentGatewayService],
  exports: [WalletService, PaymentGatewayService],
})
export class WalletModule {}
