import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AssistantApplicationStatus,
  Prisma,
  WebsiteInquiryStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssistantApplicationDto } from './dto/create-assistant-application.dto';
import { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';
import { UpdateAssistantApplicationDto } from './dto/update-assistant-application.dto';
import { UpdateWebsiteInquiryDto } from './dto/update-website-inquiry.dto';

@Injectable()
export class WebsiteService {
  constructor(private prisma: PrismaService) {}

  async createContactInquiry(dto: CreateContactInquiryDto) {
    const inquiry = await this.prisma.websiteContactInquiry.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone.trim(),
        message: dto.message.trim(),
      },
    });
    return { id: inquiry.id, message: 'Thank you! We will get back to you soon.' };
  }

  async createAssistantApplication(dto: CreateAssistantApplicationDto) {
    const application = await this.prisma.assistantApplication.create({
      data: {
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        email: dto.email?.trim().toLowerCase() || null,
        message: dto.message?.trim() || null,
        city: 'Patna',
      },
    });
    return {
      id: application.id,
      message: 'Application received! Our team will contact you shortly.',
    };
  }

  async listContactInquiries(status?: WebsiteInquiryStatus) {
    const where: Prisma.WebsiteContactInquiryWhereInput = status ? { status } : {};
    return this.prisma.websiteContactInquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateContactInquiry(id: string, dto: UpdateWebsiteInquiryDto) {
    try {
      return await this.prisma.websiteContactInquiry.update({
        where: { id },
        data: {
          status: dto.status,
          adminNote: dto.adminNote?.trim() || undefined,
        },
      });
    } catch {
      throw new NotFoundException('Contact inquiry not found');
    }
  }

  async listAssistantApplications(status?: AssistantApplicationStatus) {
    const where: Prisma.AssistantApplicationWhereInput = status ? { status } : {};
    return this.prisma.assistantApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAssistantApplication(id: string, dto: UpdateAssistantApplicationDto) {
    try {
      return await this.prisma.assistantApplication.update({
        where: { id },
        data: {
          status: dto.status,
          adminNote: dto.adminNote?.trim() || undefined,
        },
      });
    } catch {
      throw new NotFoundException('Assistant application not found');
    }
  }

  countNewContactInquiries() {
    return this.prisma.websiteContactInquiry.count({ where: { status: 'new' } });
  }

  countNewAssistantApplications() {
    return this.prisma.assistantApplication.count({ where: { status: 'new' } });
  }
}
