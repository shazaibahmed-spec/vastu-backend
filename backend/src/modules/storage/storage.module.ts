import { Module } from '@nestjs/common';
import { LocalStorageAdapter } from './adapters/local-storage.adapter.js';
import { ImageProcessingService } from './services/image-processing.service.js';
import { StorageService } from './services/storage.service.js';

import { StorageController } from './storage.controller.js';

@Module({
  controllers: [StorageController],
  providers: [ImageProcessingService, LocalStorageAdapter, StorageService],
  exports: [StorageService, ImageProcessingService],
})
export class StorageModule {}
