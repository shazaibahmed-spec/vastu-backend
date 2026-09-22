import Joi from 'joi';
import { RootConfig } from './config.interface.js';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().default('vastu-backend'),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  DATABASE_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('14d'),

  STORAGE_DRIVER: Joi.string().valid('local', 's3').default('local'),
  STORAGE_LOCAL_DIR: Joi.string().default('./uploads'),

  AI_VISION_PROVIDER: Joi.string()
    .valid('mock', 'openai', 'anthropic', 'gemini')
    .default('mock'),
  VISION_PROVIDER: Joi.string()
    .valid('existing', 'local', 'mock', 'openai', 'anthropic', 'gemini')
    .default('existing'),
  VISION_FALLBACK_ENABLED: Joi.boolean().default(false),
  VISION_FALLBACK_PROVIDER: Joi.string()
    .valid('existing', 'local', 'mock', 'openai', 'anthropic', 'gemini')
    .default('existing'),

  LOCAL_VISION_SERVICE_URL: Joi.string().default('http://localhost:8000'),
  LOCAL_VISION_MODEL: Joi.string().default('yolov8s'),
  LOCAL_VISION_MODEL_PATH: Joi.string().allow('').optional(),
  LOCAL_VISION_DEVICE: Joi.string()
    .valid('auto', 'cpu', 'gpu', 'mps')
    .default('auto'),
  LOCAL_VISION_CONFIDENCE_THRESHOLD: Joi.number().min(0).max(1).default(0.5),
  LOCAL_VISION_IMAGE_SIZE: Joi.number().default(640),
  LOCAL_VISION_TIMEOUT_MS: Joi.number().default(10000),

  AI_LLM_PROVIDER: Joi.string()
    .valid('mock', 'openai', 'anthropic', 'gemini')
    .default('mock'),
  OPENAI_API_KEY: Joi.string().allow('').optional(),
  ANTHROPIC_API_KEY: Joi.string().allow('').optional(),
  GEMINI_API_KEY: Joi.string().allow('').optional(),
  GEMINI_MODEL: Joi.string().default('gemini-3.5-flash'),
  GEMINI_FALLBACK_MODEL: Joi.string().default('gemini-3.5-flash-lite'),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
});

export const loadConfiguration = (): RootConfig => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    appName: process.env.APP_NAME || 'vastu-backend',
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim()),
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '14d',
  },
  storage: {
    driver: (process.env.STORAGE_DRIVER as 'local' | 's3') || 'local',
    localDir: process.env.STORAGE_LOCAL_DIR || './uploads',
    s3Bucket: process.env.STORAGE_S3_BUCKET,
    s3Region: process.env.STORAGE_S3_REGION,
    s3AccessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID,
    s3SecretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY,
    s3Endpoint: process.env.STORAGE_S3_ENDPOINT,
  },
  ai: {
    visionProvider:
      (process.env.VISION_PROVIDER as any) || 'existing',
    existingVisionProvider:
      (process.env.AI_VISION_PROVIDER as any) || 'mock',
    visionFallbackEnabled: process.env.VISION_FALLBACK_ENABLED === 'true',
    visionFallbackProvider:
      (process.env.VISION_FALLBACK_PROVIDER as any) || 'existing',
    localVision: {
      serviceUrl:
        process.env.LOCAL_VISION_SERVICE_URL || 'http://localhost:8000',
      model: process.env.LOCAL_VISION_MODEL || 'yolov8s',
      modelPath: process.env.LOCAL_VISION_MODEL_PATH || undefined,
      device: (process.env.LOCAL_VISION_DEVICE as any) || 'auto',
      confidenceThreshold: parseFloat(
        process.env.LOCAL_VISION_CONFIDENCE_THRESHOLD || '0.50',
      ),
      imageSize: parseInt(process.env.LOCAL_VISION_IMAGE_SIZE || '640', 10),
      timeoutMs: parseInt(process.env.LOCAL_VISION_TIMEOUT_MS || '10000', 10),
    },
    llmProvider:
      (process.env.AI_LLM_PROVIDER as
        | 'mock'
        | 'openai'
        | 'anthropic'
        | 'gemini') || 'mock',
    openAiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    geminiFallbackModel:
      process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite',
  },
  throttler: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
});
