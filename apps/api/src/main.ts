import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { requestIdMiddleware } from './common/request-id.middleware';

function resolveExistingPath(candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 5000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Security headers with CSP allowing Razorpay
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://checkout.razorpay.com',
            'https://api.razorpay.com',
          ],
          frameSrc: [
            "'self'",
            'https://api.razorpay.com',
            'https://checkout.razorpay.com',
          ],
          connectSrc: [
            "'self'",
            'https://api.razorpay.com',
            'https://checkout.razorpay.com',
          ],
          imgSrc: ["'self'", 'data:', 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(cookieParser());

  // Correlation/request ID for tracing logs and errors
  app.use(requestIdMiddleware);

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  app.use('/products', express.static(path.join(process.cwd(), 'uploads', 'products')));
  app.use('/image', express.static(path.join(process.cwd(), 'uploads', 'products')));
  app.use('/public', express.static(path.join(process.cwd(), 'public')));

  // Legacy image fallback: serve the original legacy image directory so old
  // `image/{filename}` references keep working during and after migration.
  const legacyImageDir = resolveExistingPath([
    path.join(process.cwd(), '..', '..', 'public', 'image'),
    path.join(process.cwd(), 'public', 'image'),
  ]);
  if (legacyImageDir) {
    app.use('/image', express.static(legacyImageDir));
  }

  // CORS - strict origin in production, expanded in development
  const allowedOrigins = nodeEnv === 'production'
    ? frontendUrl.split(',').map((u) => u.trim())
    : [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-request-id', 'x-razorpay-signature'],
    maxAge: nodeEnv === 'production' ? 86400 : undefined,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger only in development
  if (nodeEnv !== 'production') {
    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
    const config = new DocumentBuilder()
      .setTitle('Beauty Queen API')
      .setDescription('Beauty Queen E-commerce REST API')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`Beauty Queen API running on port ${port} [${nodeEnv}]`);
}

bootstrap();
