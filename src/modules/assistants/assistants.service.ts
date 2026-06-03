import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { haversineKm } from '../../common/utils/geo.util';

@Injectable()
export class AssistantsService {
  constructor(private prisma: PrismaService) {}

  async setOnline(userId: string, isOnline: boolean, lat?: number, lng?: number) {
    if (isOnline) {
      const profile = await this.prisma.assistantProfile.findUnique({ where: { userId } });
      if (!profile?.adminVerified) {
        throw new ForbiddenException(
          'Your account is pending admin verification. You cannot go online until approved.',
        );
      }
      if (
        lat == null ||
        lng == null ||
        Number.isNaN(lat) ||
        Number.isNaN(lng)
      ) {
        throw new BadRequestException(
          'lat and lng are required when going online so customers can find you.',
        );
      }
    }

    return this.prisma.assistantAvailability.upsert({
      where: { userId },
      create: {
        userId,
        isOnline,
        lastLat: isOnline ? lat : null,
        lastLng: isOnline ? lng : null,
      },
      update: {
        isOnline,
        ...(isOnline && lat != null && lng != null
          ? { lastLat: lat, lastLng: lng, updatedAt: new Date() }
          : { updatedAt: new Date() }),
      },
    });
  }

  async getNearbyAssistants(lat?: number, lng?: number) {
    const online = await this.getVerifiedOnlineAssistants();
    return online
      .map((a) => this.toNearbyAssistant(a, lat, lng))
      .filter((a) => !lat || !lng || a.distanceKm != null)
      .sort((a, b) => Number(a.distanceKm ?? 99) - Number(b.distanceKm ?? 99))
      .slice(0, 20);
  }

  async getAvailabilitySummary(lat: number, lng: number) {
    const settings = await this.prisma.platformSettings.findUnique({ where: { id: 'default' } });
    const matchRadiusKm = settings?.matchRadiusKm ?? 15;
    const online = await this.getVerifiedOnlineAssistants();
    const withDistance = online
      .map((a) => ({
        ...a,
        distanceKm:
          a.lastLat != null && a.lastLng != null
            ? haversineKm(lat, lng, a.lastLat, a.lastLng)
            : null,
      }))
      .filter((a) => a.distanceKm != null && a.distanceKm <= matchRadiusKm);

    const zones = [
      { label: 'Within 2 km', minKm: 0, maxKm: 2 },
      { label: '2–5 km', minKm: 2, maxKm: 5 },
      { label: '5–10 km', minKm: 5, maxKm: 10 },
    ]
      .map((z) => ({
        ...z,
        count: withDistance.filter((a) => {
          if (z.maxKm === 2) return a.distanceKm! <= 2;
          if (z.maxKm === 5) return a.distanceKm! > 2 && a.distanceKm! <= 5;
          return a.distanceKm! > 5 && a.distanceKm! <= matchRadiusKm;
        }).length,
      }))
      .filter((z) => z.count > 0);

    const within2 = withDistance.filter((a) => a.distanceKm! <= 2).length;

    return {
      totalOnline: online.length,
      nearbyAvailable: withDistance.length,
      within2Km: within2,
      matchRadiusKm,
      zones,
      message:
        withDistance.length > 0
          ? `${withDistance.length} assistant${withDistance.length === 1 ? '' : 's'} available near you`
          : online.length > 0
            ? `${online.length} online — expanding search in your area`
            : 'No assistants online right now',
    };
  }

  async updateLocation(userId: string, lat: number, lng: number) {
    const profile = await this.prisma.assistantProfile.findUnique({ where: { userId } });
    if (!profile?.adminVerified) {
      throw new ForbiddenException('Assistant not verified');
    }
    const availability = await this.prisma.assistantAvailability.findUnique({
      where: { userId },
    });
    if (!availability?.isOnline) {
      throw new BadRequestException('Go online before updating location');
    }
    return this.prisma.assistantAvailability.update({
      where: { userId },
      data: { lastLat: lat, lastLng: lng, updatedAt: new Date() },
    });
  }

  private async getVerifiedOnlineAssistants() {
    const online = await this.prisma.assistantAvailability.findMany({
      where: { isOnline: true },
      include: { user: { include: { assistantProfile: true } } },
    });
    return online.filter((a) => a.user.assistantProfile?.adminVerified);
  }

  private toNearbyAssistant(
    a: Awaited<ReturnType<AssistantsService['getVerifiedOnlineAssistants']>>[number],
    lat?: number,
    lng?: number,
  ) {
    return {
      id: a.user.id,
      name: a.user.name || 'Assistant',
      assistantCode: a.user.assistantProfile?.assistantCode,
      avatarUrl: a.user.avatarUrl,
      rating: a.user.assistantProfile?.rating ?? 5,
      totalJobs: a.user.assistantProfile?.totalJobs ?? 0,
      lat: a.lastLat,
      lng: a.lastLng,
      distanceKm:
        lat != null && lng != null && a.lastLat != null && a.lastLng != null
          ? haversineKm(lat, lng, a.lastLat, a.lastLng).toFixed(1)
          : null,
      isOnline: a.isOnline,
    };
  }

  async getStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { assistantProfile: true },
    });
    if (!user) return null;

    const reviewCount = await this.prisma.rating.count({
      where: { assistantId: userId },
    });

    return {
      userId: user.id,
      name: user.name || 'Assistant',
      assistantCode: user.assistantProfile?.assistantCode,
      avatarUrl: user.avatarUrl,
      rating: user.assistantProfile?.rating ?? 5,
      totalJobs: user.assistantProfile?.totalJobs ?? 0,
      reviewCount,
      adminVerified: user.assistantProfile?.adminVerified ?? false,
    };
  }

  async updateKyc(
    userId: string,
    data: Partial<{
      aadhaarVerified: boolean;
      selfieVerified: boolean;
      bankVerified: boolean;
      bankAccount: string;
      ifscCode: string;
    }>,
  ) {
    return this.prisma.assistantProfile.update({
      where: { userId },
      data,
    });
  }
}
