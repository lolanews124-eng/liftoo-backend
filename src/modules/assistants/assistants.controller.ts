import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AssistantsService } from './assistants.service';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { SubmitVerificationDto } from './dto/verification.dto';
class SetOnlineDto {
  @IsBoolean() isOnline: boolean;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
}

class UpdateLocationDto {
  @IsNumber() lat: number;
  @IsNumber() lng: number;
}

@Controller('api/v1/assistants')
export class AssistantsController {
  constructor(
    private assistantsService: AssistantsService,
    private verificationService: VerificationService,
  ) {}

  @Get('verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.assistant)
  getVerification(@CurrentUser() user: JwtPayload) {
    return this.verificationService.getVerificationBundle(user.sub);
  }

  @Post('verification/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.assistant)
  submitVerification(@CurrentUser() user: JwtPayload, @Body() dto: SubmitVerificationDto) {
    return this.verificationService.submitDocument(user.sub, dto);
  }

  /** Moved to AdminModule — PATCH /api/v1/admin/verifications/review */

  @Get('availability-summary')
  getAvailabilitySummary(@Query('lat') lat: string, @Query('lng') lng: string) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      throw new BadRequestException('lat and lng are required');
    }
    return this.assistantsService.getAvailabilitySummary(parsedLat, parsedLng);
  }

  @Get('nearby')
  getNearby(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    return this.assistantsService.getNearbyAssistants(
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
    );
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.assistantsService.getStats(id);
  }

  @Post('online')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.assistant)
  setOnline(@CurrentUser() user: JwtPayload, @Body() dto: SetOnlineDto) {
    return this.assistantsService.setOnline(
      user.sub,
      dto.isOnline,
      dto.lat,
      dto.lng,
    );
  }

  @Patch('location')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.assistant)
  updateLocation(@CurrentUser() user: JwtPayload, @Body() dto: UpdateLocationDto) {
    return this.assistantsService.updateLocation(user.sub, dto.lat, dto.lng);
  }

  @Patch('kyc')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.assistant)
  updateKyc(@CurrentUser() user: JwtPayload, @Body() dto: Record<string, unknown>) {
    return this.assistantsService.updateKyc(user.sub, dto as never);
  }
}
