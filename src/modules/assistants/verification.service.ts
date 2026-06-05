import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  VerificationDocType,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  REQUIRED_VERIFICATION_TYPES,
  VERIFICATION_TYPE_LABELS,
} from './verification.constants';
import { ReviewVerificationDto, SubmitVerificationDto } from './dto/verification.dto';

@Injectable()
export class VerificationService {
  constructor(private prisma: PrismaService) {}

  async getVerificationBundle(userId: string) {
    const existing = await this.prisma.assistantVerificationDocument.findMany({
      where: { userId },
    });
    const byType = new Map(existing.map((d) => [d.type, d]));

    const documents = REQUIRED_VERIFICATION_TYPES.map((type) => {
      const doc = byType.get(type);
      if (!doc) {
        return {
          type,
          label: VERIFICATION_TYPE_LABELS[type],
          status: VerificationStatus.not_submitted,
          fileUrl: null,
          textValue: null,
          metadata: null,
          adminNote: null,
          uploadedAt: null,
          verifiedAt: null,
          canEdit: true,
        };
      }
      return {
        type: doc.type,
        label: VERIFICATION_TYPE_LABELS[doc.type],
        status: doc.status,
        fileUrl: doc.fileUrl,
        textValue: doc.textValue,
        metadata: doc.metadata,
        adminNote: doc.adminNote,
        uploadedAt: doc.uploadedAt,
        verifiedAt: doc.verifiedAt,
        canEdit:
          doc.status === VerificationStatus.rejected ||
          doc.status === VerificationStatus.not_submitted,
      };
    });

    const verifiedCount = documents.filter(
      (d) => d.status === VerificationStatus.verified,
    ).length;
    const pendingCount = documents.filter(
      (d) => d.status === VerificationStatus.pending,
    ).length;

    return {
      documents,
      summary: {
        totalRequired: REQUIRED_VERIFICATION_TYPES.length,
        verifiedCount,
        pendingCount,
        rejectedCount: documents.filter(
          (d) => d.status === VerificationStatus.rejected,
        ).length,
        completionPercent: Math.round(
          (verifiedCount / REQUIRED_VERIFICATION_TYPES.length) * 100,
        ),
        fullyVerified: verifiedCount === REQUIRED_VERIFICATION_TYPES.length,
      },
    };
  }

  async submitDocument(userId: string, dto: SubmitVerificationDto) {
    if (!REQUIRED_VERIFICATION_TYPES.includes(dto.type)) {
      throw new BadRequestException('Invalid document type');
    }

    const textOnlyTypes: VerificationDocType[] = [VerificationDocType.full_address];
    const needsFile = !textOnlyTypes.includes(dto.type);

    if (needsFile && !dto.fileUrl) {
      throw new BadRequestException('File is required for this document');
    }

    if (dto.type === VerificationDocType.full_address) {
      const meta = dto.metadata as {
        fullAddress?: string;
        district?: string;
        state?: string;
        country?: string;
        pincode?: string;
      } | null;
      const hasMeta =
        meta?.fullAddress?.trim() &&
        meta?.district?.trim() &&
        meta?.state?.trim() &&
        meta?.country?.trim() &&
        meta?.pincode?.trim()?.length === 6;
      if (!hasMeta && !dto.textValue?.trim()) {
        throw new BadRequestException('Complete address details are required');
      }
    }

    if (dto.type === VerificationDocType.bank_details) {
      const meta = dto.metadata as {
        accountHolderName?: string;
        bankName?: string;
        accountNumber?: string;
        ifsc?: string;
      } | null;
      if (
        !meta?.accountHolderName?.trim() ||
        !meta?.bankName?.trim() ||
        !meta?.accountNumber?.trim() ||
        !meta?.ifsc?.trim()
      ) {
        throw new BadRequestException(
          'Account holder name, bank name, account number and IFSC are required',
        );
      }
      if (!dto.fileUrl?.trim()) {
        throw new BadRequestException('Passbook photo is required');
      }
    }

    const existing = await this.prisma.assistantVerificationDocument.findUnique({
      where: { userId_type: { userId, type: dto.type } },
    });

    if (
      existing &&
      (existing.status === VerificationStatus.pending ||
        existing.status === VerificationStatus.verified)
    ) {
      throw new ForbiddenException(
        'Document is locked while pending or after verification',
      );
    }

    const data: Prisma.AssistantVerificationDocumentUpsertArgs['create'] = {
      userId,
      type: dto.type,
      status: VerificationStatus.pending,
      fileUrl: dto.fileUrl ?? null,
      textValue: dto.textValue ?? null,
      metadata: (dto.metadata ?? null) as Prisma.InputJsonValue,
      adminNote: null,
      uploadedAt: new Date(),
      verifiedAt: null,
      verifiedBy: null,
    };

    await this.prisma.assistantVerificationDocument.upsert({
      where: { userId_type: { userId, type: dto.type } },
      create: data,
      update: {
        ...data,
        status: VerificationStatus.pending,
      },
    });

    await this.syncLegacyProfileFlags(userId);
    return this.getVerificationBundle(userId);
  }

  /** Admin panel: approve or reject a document. */
  async reviewDocument(dto: ReviewVerificationDto) {
    if (
      dto.status !== VerificationStatus.verified &&
      dto.status !== VerificationStatus.rejected
    ) {
      throw new BadRequestException('Status must be verified or rejected');
    }

    const doc = await this.prisma.assistantVerificationDocument.findUnique({
      where: {
        userId_type: { userId: dto.userId, type: dto.type },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');

    await this.prisma.assistantVerificationDocument.update({
      where: { id: doc.id },
      data: {
        status: dto.status,
        adminNote: dto.adminNote ?? null,
        verifiedAt: dto.status === VerificationStatus.verified ? new Date() : null,
        verifiedBy: dto.verifiedBy ?? null,
      },
    });

    await this.syncLegacyProfileFlags(dto.userId);
    return this.getVerificationBundle(dto.userId);
  }

  private async syncLegacyProfileFlags(userId: string) {
    const docs = await this.prisma.assistantVerificationDocument.findMany({
      where: { userId },
    });
    const verified = (type: VerificationDocType) =>
      docs.find((d) => d.type === type)?.status === VerificationStatus.verified;

    const bankDoc = docs.find((d) => d.type === VerificationDocType.bank_details);

    await this.prisma.assistantProfile.update({
      where: { userId },
      data: {
        aadhaarVerified: verified(VerificationDocType.aadhaar),
        selfieVerified: verified(VerificationDocType.selfie),
        bankVerified: verified(VerificationDocType.bank_details),
        bankAccount:
          (bankDoc?.metadata as { accountNumber?: string } | null)?.accountNumber ??
          undefined,
        ifscCode:
          (bankDoc?.metadata as { ifsc?: string } | null)?.ifsc ?? undefined,
      },
    });
  }
}
