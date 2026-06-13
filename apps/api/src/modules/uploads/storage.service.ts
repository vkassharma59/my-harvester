import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface StoredFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

function extFromName(name?: string): string {
  const m = /\.[a-zA-Z0-9]+$/.exec(name ?? '');
  return m ? m[0].toLowerCase() : '';
}

function extFromMime(mime: string): string {
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return '.jpg';
  if (mime === 'image/png') return '.png';
  return '';
}

@Injectable()
export class StorageService {
  private readonly dir = join(process.cwd(), 'uploads');

  /**
   * Persist an uploaded file and return its public URL.
   *
   * For now this writes to a local `uploads/` directory served statically. To
   * move to S3 later, replace the body with a putObject call and return the
   * object's URL — the absolute-URL contract is all the callers depend on.
   */
  async save(file: StoredFile, origin: string): Promise<string> {
    await fs.mkdir(this.dir, { recursive: true });
    const ext = extFromName(file.originalname) || extFromMime(file.mimetype);
    const name = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
    await fs.writeFile(join(this.dir, name), file.buffer);
    return `${origin}/uploads/${name}`;
  }
}
