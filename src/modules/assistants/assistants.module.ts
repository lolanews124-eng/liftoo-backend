import { Module } from '@nestjs/common';
import { AssistantsController } from './assistants.controller';
import { AssistantsService } from './assistants.service';
import { VerificationService } from './verification.service';

@Module({
  controllers: [AssistantsController],
  providers: [AssistantsService, VerificationService],
  exports: [AssistantsService, VerificationService],
})
export class AssistantsModule {}
