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
      this.logger.error('PostgreSQL connection failed', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.dbReady) await this.$disconnect();
  }
}
