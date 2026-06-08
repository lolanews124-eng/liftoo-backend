import { Body, Controller, Post } from '@nestjs/common';
import { CreateAssistantApplicationDto } from './dto/create-assistant-application.dto';
import { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';
import { WebsiteService } from './website.service';

@Controller('api/v1/website')
export class WebsiteController {
  constructor(private website: WebsiteService) {}

  @Post('contact')
  submitContact(@Body() dto: CreateContactInquiryDto) {
    return this.website.createContactInquiry(dto);
  }

  @Post('assistant-apply')
  submitAssistantApplication(@Body() dto: CreateAssistantApplicationDto) {
    return this.website.createAssistantApplication(dto);
  }
}
