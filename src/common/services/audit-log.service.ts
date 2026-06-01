import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(
    adminId: string,
    action: string,
    entity: string,
    entityId?: string,
    metadata?: Record<string, unknown>,
  ) {
    if (!this.prisma.dbReady) return;
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        entity,
        entityId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async list(page = 1, limit = 50) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [items, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminAuditLog.count(),
    ]);
    return { items, total, page, limit: take };
  }
}
