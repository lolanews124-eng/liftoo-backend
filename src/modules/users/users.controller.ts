import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { IsBoolean, IsNumber, IsOptional, IsString, Matches } from 'class-validator';

class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian mobile number' })
  phone?: string;
}

class UpdateFcmTokenDto {
  @IsOptional() @IsString() token?: string;
}

class CreateAddressDto {
  @IsString() label: string;
  @IsString() formattedAddress: string;
  @IsNumber() lat: number;
  @IsNumber() lng: number;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Put('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Put('me/fcm-token')
  updateFcmToken(@CurrentUser() user: JwtPayload, @Body() dto: UpdateFcmTokenDto) {
    return this.usersService.updateFcmToken(user.sub, dto.token ?? null);
  }

  @Delete('me')
  deleteMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.deleteAccount(user.sub);
  }

  @Get('addresses')
  getAddresses(@CurrentUser() user: JwtPayload) {
    return this.usersService.getAddresses(user.sub);
  }

  @Post('addresses')
  createAddress(@CurrentUser() user: JwtPayload, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(user.sub, dto);
  }

  @Patch('addresses/:id')
  updateAddress(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.updateAddress(user.sub, id, dto);
  }

  @Delete('addresses/:id')
  deleteAddress(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.usersService.deleteAddress(user.sub, id);
  }

  @Post('addresses/:id/default')
  setDefaultAddress(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.usersService.setDefaultAddress(user.sub, id);
  }
}
