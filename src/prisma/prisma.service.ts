import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  dbReady = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.dbReady = true;
    } catch (error) {
      if (process.env.ADMIN_DEV_MODE === 'true') {
        this.logger.warn(
          'PostgreSQL unavailable — ADMIN_DEV_MODE enabled. Admin APIs use in-memory demo data.',
        );
        return;
      }
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.dbReady) await this.$disconnect();
  }
}
