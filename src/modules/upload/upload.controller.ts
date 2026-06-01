import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

const uploadDir = join(process.cwd(), 'uploads');

function ensureUploadDir() {
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
}

@Controller('api/v1/upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: { originalname: string; buffer: Buffer; size: number },
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const ext = extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (!allowed.includes(ext)) {
      throw new BadRequestException('Only images and PDF allowed');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File too large (max 5MB)');
    }

    ensureUploadDir();
    const filename = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
    writeFileSync(join(uploadDir, filename), file.buffer);

    const baseUrl = process.env.API_PUBLIC_URL ?? 'http://localhost:3000';
    return {
      url: `${baseUrl}/uploads/${filename}`,
      filename,
      uploadedBy: user.sub,
    };
  }
}
