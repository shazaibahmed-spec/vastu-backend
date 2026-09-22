export interface StorageUploadResult {
  storageKey: string;
  url: string;
  sizeBytes: number;
}

export interface StorageProvider {
  saveFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<StorageUploadResult>;

  getFile(storageKey: string): Promise<Buffer>;

  deleteFile(storageKey: string): Promise<void>;

  getSignedUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;
}
