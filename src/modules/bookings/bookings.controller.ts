import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { BookingsService } from './bookings.service';
import {
  CreateBookingDto,
  VerifyOtpDto,
  PayBookingDto,
  RejectBookingDto,
  CancelBookingDto,
  ConfirmCashPaymentDto,
} from './dto/booking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('api/v1/bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.customer)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.sub, dto);
  }

  @Post(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.customer)
  confirm(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.bookingsService.confirm(user.sub, id);
  }

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('as') asRole?: string,
  ) {
    if (asRole === 'assistant') {
      return this.bookingsService.findForAssistant(user.sub, status);
    }
    return this.bookingsService.findForCustomer(user.sub, status);
  }

  @Get('active-job')
  @UseGuards(RolesGuard)
  @Roles(UserRole.assistant)
  activeJob(@CurrentUser() user: JwtPayload) {
    return this.bookingsService.getActiveJob(user.sub);
  }

  @Get('nearby')
  @UseGuards(RolesGuard)
  @Roles(UserRole.assistant)
  nearby(@CurrentUser() user: JwtPayload) {
    return this.bookingsService.findNearbyRequests(user.sub);
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.bookingsService.findOne(id, user.sub);
  }

  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles(UserRole.assistant)
  accept(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.bookingsService.accept(user.sub, id);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.assistant)
  reject(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: RejectBookingDto) {
    return this.bookingsService.reject(user.sub, id, dto.reason);
  }

  @Post(':id/arriving')
  @UseGuards(RolesGuard)
  @Roles(UserRole.assistant)
  arriving(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.bookingsService.setArriving(user.sub, id);
  }

  @Post(':id/otp/verify')
  verifyOtp(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: VerifyOtpDto,
  ) {
    return this.bookingsService.verifyOtp(user.sub, id, dto.otp);
  }

  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.assistant)
  complete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.bookingsService.complete(user.sub, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CancelBookingDto) {
    return this.bookingsService.cancel(user.sub, id, dto.reason, dto.note);
  }

  @Post(':id/pay')
  @UseGuards(RolesGuard)
  @Roles(UserRole.customer)
  pay(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PayBookingDto,
  ) {
    return this.bookingsService.pay(user.sub, id, dto.method);
  }

  @Post(':id/cash/collect')
  @UseGuards(RolesGuard)
  @Roles(UserRole.assistant)
  markCashCollected(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.bookingsService.markCashCollected(user.sub, id);
  }

  @Post(':id/cash/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.customer)
  confirmCashPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ConfirmCashPaymentDto,
  ) {
    return this.bookingsService.confirmCashPayment(user.sub, id, dto.otp);
  }
}
