import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { LocalStorageAdapter } from '../adapters/local-storage.adapter.js';
import { StorageUploadResult } from '../interfaces/storage-provider.interface.js';
import {
  ImageProcessingService,
  ProcessedImageResult,
} from './image-processing.service.js';

export interface StoredImageResult {
  uploadResult: StorageUploadResult;
  processedImage: ProcessedImageResult;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly imageProcessor: ImageProcessingService,
    private readonly storageAdapter: LocalStorageAdapter,
  ) {}

  /**
   * Sanitizes, converts to WebP, and stores an uploaded room photo.
   */
  async processAndStoreImage(
    rawBuffer: Buffer,
    originalFilename = 'room-photo.jpg',
  ): Promise<StoredImageResult> {
    const processed = await this.imageProcessor.processAndSanitizeImage(
      rawBuffer,
      originalFilename,
    );

    const uniqueStorageKey = `${uuidv4()}.${processed.extension}`;
    const uploadResult = await this.storageAdapter.saveFile(
      processed.processedBuffer,
      uniqueStorageKey,
      processed.mimeType,
    );

    this.logger.log(
      `Image processed and stored: ${uniqueStorageKey} (${processed.width}x${processed.height}, ${processed.sizeBytes} bytes)`,
    );

    return {
      uploadResult,
      processedImage: processed,
    };
  }

  async getFile(storageKey: string): Promise<Buffer> {
    return this.storageAdapter.getFile(storageKey);
  }

  async getSignedUrl(storageKey: string): Promise<string> {
    return this.storageAdapter.getSignedUrl(storageKey);
  }

  async assessImageQuality(buffer: Buffer) {
    return this.imageProcessor.assessImageQuality(buffer);
  }

  async deleteFile(storageKey: string): Promise<void> {
    return this.storageAdapter.deleteFile(storageKey);
  }
}
