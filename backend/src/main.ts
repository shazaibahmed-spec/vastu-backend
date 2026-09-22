import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { TransformResponseInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api/v1';
  const corsOrigins = configService.get<string[]>('app.corsOrigins') || [
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  // Increase JSON and URL-encoded body limit for Base64 image uploads
  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ extended: true, limit: '20mb' }));

  // Security Headers (CSP disabled to allow Swagger UI scripts & assets)
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  // CORS
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global Route Prefix
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['', 'health', 'api/docs', 'api/docs-json'],
  });

  // Global Interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformResponseInterceptor(),
  );

  // Global Filters
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Swagger / OpenAPI Configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Vastu AI Backend Engine API')
    .setDescription(
      'Automated architectural Vastu Shastra spatial analysis engine using computer vision and deterministic rules.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Analysis', 'Spatial analysis creation, state transitions, and reports')
    .addTag('Auth', 'Authentication, token issuance, and refresh rotation')
    .addTag('System', 'Healthchecks and system status')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Vastu AI Backend API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`🚀 Vastu AI backend successfully running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
