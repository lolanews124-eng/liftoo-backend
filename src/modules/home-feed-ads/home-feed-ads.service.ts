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

  /** Active ads shown on customer home carousel (below Refer & Earn). */
  async listActiveForApp(limit = 5): Promise<HomeFeedAdPayload[]> {
    if (!this.prisma.dbReady) return [];
    const rows = await this.prisma.homeFeedAd.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      take: limit,
    });
    return rows.map((row) => this.map(row));
  }

  /** @deprecated Use listActiveForApp — kept for backward compatibility. */
  async getActiveForApp(): Promise<HomeFeedAdPayload | null> {
    const ads = await this.listActiveForApp(1);
    return ads[0] ?? null;
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
    return this.prisma.homeFeedAd.update({
      where: { id },
      data: { isActive },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.homeFeedAd.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.homeFeedAd.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Home feed ad not found');
    return row;
  }
}
