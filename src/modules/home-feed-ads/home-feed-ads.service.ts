import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type HomeFeedAdPayload = {
  id: string;
  title: string | null;
  imageUrl: string;
  buttonLabel: string | null;
  buttonLink: string | null;
  buttonAction: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class HomeFeedAdsService {
  constructor(private prisma: PrismaService) {}

  private map(row: HomeFeedAdPayload) {
    return row;
  }

  /** Active ad shown on customer home (below Refer & Earn). */
  async getActiveForApp(): Promise<HomeFeedAdPayload | null> {
    if (!this.prisma.dbReady) return null;
    const row = await this.prisma.homeFeedAd.findFirst({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    return row ? this.map(row) : null;
  }

  async listAll() {
    if (!this.prisma.dbReady) return [];
    return this.prisma.homeFeedAd.findMany({
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async create(data: {
    title?: string;
    imageUrl: string;
    buttonLabel?: string;
    buttonLink?: string;
    buttonAction?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    if (data.isActive) {
      await this.deactivateAll();
    }
    return this.prisma.homeFeedAd.create({
      data: {
        title: data.title?.trim() || null,
        imageUrl: data.imageUrl.trim(),
        buttonLabel: data.buttonLabel?.trim() || null,
        buttonLink: data.buttonLink?.trim() || null,
        buttonAction: data.buttonAction === 'route' ? 'route' : 'url',
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? false,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      title: string | null;
      imageUrl: string;
      buttonLabel: string | null;
      buttonLink: string | null;
      buttonAction: string;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    await this.ensureExists(id);
    if (data.isActive === true) {
      await this.deactivateAll(id);
    }
    return this.prisma.homeFeedAd.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title?.trim() || null } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl.trim() } : {}),
        ...(data.buttonLabel !== undefined ? { buttonLabel: data.buttonLabel?.trim() || null } : {}),
        ...(data.buttonLink !== undefined ? { buttonLink: data.buttonLink?.trim() || null } : {}),
        ...(data.buttonAction !== undefined
          ? { buttonAction: data.buttonAction === 'route' ? 'route' : 'url' }
          : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async setActive(id: string, isActive: boolean) {
    await this.ensureExists(id);
    if (isActive) {
      await this.deactivateAll(id);
    }
    return this.prisma.homeFeedAd.update({
      where: { id },
      data: { isActive },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.homeFeedAd.delete({ where: { id } });
  }

  private async deactivateAll(exceptId?: string) {
    await this.prisma.homeFeedAd.updateMany({
      where: exceptId ? { id: { not: exceptId } } : {},
      data: { isActive: false },
    });
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.homeFeedAd.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Home feed ad not found');
    return row;
  }
}
