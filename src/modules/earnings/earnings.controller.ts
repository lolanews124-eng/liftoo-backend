import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { EarningsService } from './earnings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('api/v1/earnings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.assistant)
export class EarningsController {
  constructor(private earningsService: EarningsService) {}

  @Get()
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.earningsService.getSummary(user.sub);
  }
}
