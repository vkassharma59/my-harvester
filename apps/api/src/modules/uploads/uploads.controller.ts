import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { StorageService, StoredFile } from './storage.service';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  /** Accepts a single `file` (bill / receipt / any document up to 5 MB). */
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SIZE } }))
  async upload(@UploadedFile() file: StoredFile, @Req() req: Request): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.size > MAX_SIZE) throw new BadRequestException('File exceeds the 5 MB limit');
    const origin = `${req.protocol}://${req.get('host')}`;
    const url = await this.storage.save(file, origin);
    return { url };
  }
}
