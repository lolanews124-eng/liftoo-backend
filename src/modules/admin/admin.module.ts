import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthService } from './admin-auth.service';
import { AssistantsModule } from '../assistants/assistants.module';
import { AuditLogService } from '../../common/services/audit-log.service';
import { PromosModule } from '../promos/promos.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { SupportModule } from '../support/support.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AssistantsModule, PromosModule, PayoutsModule, SupportModule, NotificationsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthService, AuditLogService],
})
export class AdminModule {}
