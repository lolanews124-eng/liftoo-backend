import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type HomeHeroSlidePayload = {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  imageUrl: string;
  accentColor: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class HomeHeroSlidesService {
  constructor(private prisma: PrismaService) {}

  async listActiveForApp(limit = 6): Promise<HomeHeroSlidePayload[]> {
    if (!this.prisma.dbReady) return [];
    const rows = await this.prisma.homeHeroSlide.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      take: limit,
    });
    return rows;
  }

  async listAll() {
    if (!this.prisma.dbReady) return [];
    return this.prisma.homeHeroSlide.findMany({
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async create(data: {
    tag: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    imageUrl: string;
    accentColor?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return this.prisma.homeHeroSlide.create({
      data: {
        tag: data.tag.trim(),
        title: data.title.trim(),
        subtitle: data.subtitle.trim(),
        ctaLabel: data.ctaLabel.trim(),
        imageUrl: data.imageUrl.trim(),
        accentColor: data.accentColor?.trim() || null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? false,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      tag: string;
      title: string;
      subtitle: string;
      ctaLabel: string;
      imageUrl: string;
      accentColor: string | null;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    await this.ensureExists(id);
    return this.prisma.homeHeroSlide.update({
      where: { id },
      data: {
        ...(data.tag !== undefined ? { tag: data.tag.trim() } : {}),
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.subtitle !== undefined ? { subtitle: data.subtitle.trim() } : {}),
        ...(data.ctaLabel !== undefined ? { ctaLabel: data.ctaLabel.trim() } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl.trim() } : {}),
        ...(data.accentColor !== undefined ? { accentColor: data.accentColor?.trim() || null } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async setActive(id: string, isActive: boolean) {
    await this.ensureExists(id);
    return this.prisma.homeHeroSlide.update({
      where: { id },
      data: { isActive },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.homeHeroSlide.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.homeHeroSlide.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Home hero slide not found');
    return row;
  }
}
