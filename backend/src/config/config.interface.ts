export interface AppConfig {
  nodeEnv: string;
  port: number;
  appName: string;
  apiPrefix: string;
  corsOrigins: string[];
}

export interface DatabaseConfig {
  url: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtAccessExpiration: string;
  jwtRefreshExpiration: string;
}

export interface StorageConfig {
  driver: 'local' | 's3';
  localDir: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3Endpoint?: string;
}

export interface LocalVisionConfig {
  serviceUrl: string;
  model: string;
  modelPath?: string;
  device: 'auto' | 'cpu' | 'gpu' | 'mps';
  confidenceThreshold: number;
  imageSize: number;
  timeoutMs: number;
}

export interface AiConfig {
  visionProvider: 'existing' | 'local' | 'mock' | 'openai' | 'anthropic' | 'gemini';
  existingVisionProvider: 'mock' | 'openai' | 'anthropic' | 'gemini';
  visionFallbackEnabled: boolean;
  visionFallbackProvider: 'existing' | 'local' | 'mock' | 'openai' | 'anthropic' | 'gemini';
  localVision: LocalVisionConfig;
  llmProvider: 'mock' | 'openai' | 'anthropic' | 'gemini';
  openAiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  geminiFallbackModel?: string;
}

export interface ThrottlerConfig {
  ttl: number;
  limit: number;
}

export interface RootConfig {
  app: AppConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
  storage: StorageConfig;
  ai: AiConfig;
  throttler: ThrottlerConfig;
}
