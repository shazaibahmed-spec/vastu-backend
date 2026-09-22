import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fs from 'fs/promises';
import path from 'path';
import {
  StorageProvider,
  StorageUploadResult,
} from '../interfaces/storage-provider.interface.js';

@Injectable()
export class LocalStorageAdapter implements StorageProvider {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly baseDir: string;

  constructor(private readonly configService: ConfigService) {
    this.baseDir = path.resolve(
      this.configService.get<string>('storage.localDir') || './uploads',
    );
  }

  private async ensureBaseDir(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  async saveFile(
    buffer: Buffer,
    filename: string,
    _mimeType: string,
  ): Promise<StorageUploadResult> {
    await this.ensureBaseDir();
    const filePath = path.join(this.baseDir, filename);
    await fs.writeFile(filePath, buffer);

    this.logger.debug(`Saved file locally to: ${filePath}`);

    return {
      storageKey: filename,
      url: `/uploads/${filename}`,
      sizeBytes: buffer.length,
    };
  }

  async getFile(storageKey: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, storageKey);
    return fs.readFile(filePath);
  }

  async deleteFile(storageKey: string): Promise<void> {
    const filePath = path.join(this.baseDir, storageKey);
    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      this.logger.warn(`Could not delete local file ${filePath}: ${err.message}`);
    }
  }

  async getSignedUrl(
    storageKey: string,
    _expiresInSeconds = 900,
  ): Promise<string> {
    // In local development, return direct URL path
    return `/uploads/${storageKey}`;
  }
}
