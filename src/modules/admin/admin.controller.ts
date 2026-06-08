import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  AdminBookingsQueryDto,
  AdminLoginDto,
  AdminReviewVerificationDto,
  AdminUsersQueryDto,
  AdminVerificationsQueryDto,
  CreateCategoryDto,
  CreateCityDto,
  PaginationQueryDto,
  UpdateAdminUserDto,
  UpdateBookingStatusDto,
  UpdateCategoryDto,
  UpdateCityDto,
  UpdatePlatformSettingsDto,
  VerifyAssistantDto,
  CreatePromoDto,
  ProcessPayoutDto,
  UpdateSupportTicketDto,
  AdminBroadcastNotificationDto,
  CreateHomeFeedAdDto,
  UpdateHomeFeedAdDto,
  CreateHomeHeroSlideDto,
  UpdateHomeHeroSlideDto,
} from './dto/admin.dto';
import { UpdateAssistantApplicationDto } from '../website/dto/update-assistant-application.dto';
import { UpdateWebsiteInquiryDto } from '../website/dto/update-website-inquiry.dto';

@Controller('api/v1/admin')
export class AdminController {
  constructor(
    private adminAuth: AdminAuthService,
    private adminService: AdminService,
  ) {}

  @Post('auth/login')
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuth.login(dto);
  }

  @Get('auth/me')
  @UseGuards(JwtAuthGuard, AdminGuard)
  me(@CurrentUser('sub') userId: string) {
    return this.adminAuth.me(userId);
  }

  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  dashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/analytics')
  @UseGuards(JwtAuthGuard, AdminGuard)
  dashboardAnalytics() {
    return this.adminService.getDashboardAnalytics();
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateUser(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Get('assistants')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listAssistants(@Query() query: PaginationQueryDto) {
    return this.adminService.listAssistants(query);
  }

  @Get('verifications')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listVerifications(@Query() query: AdminVerificationsQueryDto) {
    return this.adminService.listVerifications(query);
  }

  @Get('verifications/:userId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getVerification(@Param('userId') userId: string) {
    return this.adminService.getVerification(userId);
  }

  @Patch('verifications/review')
  @UseGuards(JwtAuthGuard, AdminGuard)
  reviewVerification(
    @CurrentUser() admin: JwtPayload,
    @Body() dto: AdminReviewVerificationDto,
  ) {
    return this.adminService.reviewVerification(admin.sub, dto);
  }

  @Get('bookings/export/csv')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="bookings.csv"')
  exportBookings() {
    return this.adminService.exportBookingsCsv();
  }

  @Get('bookings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listBookings(@Query() query: AdminBookingsQueryDto) {
    return this.adminService.listBookings(query);
  }

  @Get('bookings/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getBooking(@Param('id') id: string) {
    return this.adminService.getBooking(id);
  }

  @Patch('bookings/:id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateBookingStatus(@Param('id') id: string, @Body() dto: UpdateBookingStatusDto) {
    return this.adminService.updateBookingStatus(id, dto);
  }

  @Get('categories')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listCategories() {
    return this.adminService.listCategories();
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.adminService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  @Get('cities')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listCities() {
    return this.adminService.listCities();
  }

  @Post('cities')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createCity(@Body() dto: CreateCityDto) {
    return this.adminService.createCity(dto);
  }

  @Patch('cities/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateCity(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.adminService.updateCity(id, dto);
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listPayments(@Query() query: PaginationQueryDto) {
    return this.adminService.listPayments(query);
  }

  @Get('earnings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listEarnings(@Query() query: PaginationQueryDto) {
    return this.adminService.listEarnings(query);
  }

  @Patch('earnings/:id/payout')
  @UseGuards(JwtAuthGuard, AdminGuard)
  markEarningPaidOut(@Param('id') id: string) {
    return this.adminService.markEarningPaidOut(id);
  }

  @Get('ratings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listRatings(@Query() query: PaginationQueryDto) {
    return this.adminService.listRatings(query);
  }

  @Get('app-reviews')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listAppReviews(@Query() query: PaginationQueryDto) {
    return this.adminService.listAppReviews(query);
  }

  @Get('referrals')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listReferrals(@Query() query: PaginationQueryDto) {
    return this.adminService.listReferrals(query);
  }

  @Get('home-feed-ads')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listHomeFeedAds() {
    return this.adminService.listHomeFeedAds();
  }

  @Post('home-feed-ads')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createHomeFeedAd(@CurrentUser('sub') adminId: string, @Body() dto: CreateHomeFeedAdDto) {
    return this.adminService.createHomeFeedAd(adminId, dto);
  }

  @Patch('home-feed-ads/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateHomeFeedAd(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHomeFeedAdDto,
  ) {
    return this.adminService.updateHomeFeedAd(adminId, id, dto);
  }

  @Patch('home-feed-ads/:id/toggle')
  @UseGuards(JwtAuthGuard, AdminGuard)
  toggleHomeFeedAd(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.adminService.toggleHomeFeedAd(adminId, id, isActive);
  }

  @Delete('home-feed-ads/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  deleteHomeFeedAd(@CurrentUser('sub') adminId: string, @Param('id') id: string) {
    return this.adminService.deleteHomeFeedAd(adminId, id);
  }

  @Get('home-hero-slides')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listHomeHeroSlides() {
    return this.adminService.listHomeHeroSlides();
  }

  @Post('home-hero-slides')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createHomeHeroSlide(@CurrentUser('sub') adminId: string, @Body() dto: CreateHomeHeroSlideDto) {
    return this.adminService.createHomeHeroSlide(adminId, dto);
  }

  @Patch('home-hero-slides/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateHomeHeroSlide(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHomeHeroSlideDto,
  ) {
    return this.adminService.updateHomeHeroSlide(adminId, id, dto);
  }

  @Patch('home-hero-slides/:id/toggle')
  @UseGuards(JwtAuthGuard, AdminGuard)
  toggleHomeHeroSlide(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.adminService.toggleHomeHeroSlide(adminId, id, isActive);
  }

  @Delete('home-hero-slides/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  deleteHomeHeroSlide(@CurrentUser('sub') adminId: string, @Param('id') id: string) {
    return this.adminService.deleteHomeHeroSlide(adminId, id);
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateSettings(@Body() dto: UpdatePlatformSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  @Patch('assistants/:userId/verify')
  @UseGuards(JwtAuthGuard, AdminGuard)
  verifyAssistant(
    @CurrentUser('sub') adminId: string,
    @Param('userId') userId: string,
    @Body() dto: VerifyAssistantDto,
  ) {
    return this.adminService.verifyAssistant(userId, adminId, dto);
  }

  @Get('rejections')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listRejections(@Query() query: PaginationQueryDto) {
    return this.adminService.listRejections(query);
  }

  @Get('promos')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listPromos() {
    return this.adminService.listPromos();
  }

  @Post('promos')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createPromo(@CurrentUser('sub') adminId: string, @Body() dto: CreatePromoDto) {
    return this.adminService.createPromo(adminId, dto);
  }

  @Patch('promos/:id/toggle')
  @UseGuards(JwtAuthGuard, AdminGuard)
  togglePromo(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.adminService.togglePromo(adminId, id, isActive);
  }

  @Get('payouts')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listPayouts(@Query('status') status?: string) {
    return this.adminService.listPayoutRequests(status);
  }

  @Patch('payouts/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  processPayout(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body() dto: ProcessPayoutDto,
  ) {
    return this.adminService.processPayout(adminId, id, dto);
  }

  @Get('support')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listSupport(@Query('status') status?: string) {
    return this.adminService.listSupportTickets(status);
  }

  @Patch('support/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateSupport(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    return this.adminService.updateSupportTicket(adminId, id, dto);
  }

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard, AdminGuard)
  auditLogs(@Query() query: PaginationQueryDto) {
    return this.adminService.listAuditLogs(query);
  }

  @Post('notifications/broadcast')
  @UseGuards(JwtAuthGuard, AdminGuard)
  broadcastNotification(
    @CurrentUser('sub') adminId: string,
    @Body() dto: AdminBroadcastNotificationDto,
  ) {
    return this.adminService.broadcastNotification(adminId, dto);
  }

  @Get('notifications/broadcasts')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listNotificationBroadcasts(@Query() query: PaginationQueryDto) {
    return this.adminService.listNotificationBroadcasts(query);
  }

  @Get('website/contact-inquiries')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listWebsiteContactInquiries(@Query('status') status?: string) {
    return this.adminService.listWebsiteContactInquiries(status as never);
  }

  @Patch('website/contact-inquiries/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateWebsiteContactInquiry(
    @Param('id') id: string,
    @Body() dto: UpdateWebsiteInquiryDto,
  ) {
    return this.adminService.updateWebsiteContactInquiry(id, dto);
  }

  @Get('website/assistant-applications')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listAssistantApplications(@Query('status') status?: string) {
    return this.adminService.listAssistantApplications(status as never);
  }

  @Patch('website/assistant-applications/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateAssistantApplication(
    @Param('id') id: string,
    @Body() dto: UpdateAssistantApplicationDto,
  ) {
    return this.adminService.updateAssistantApplication(id, dto);
  }
}
