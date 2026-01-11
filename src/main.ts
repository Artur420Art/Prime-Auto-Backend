import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';

import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Increase body parser limits for large file uploads
    bodyParser: true,
    rawBody: true,
  });

  app.enableCors();

  // Configure body size limits for file uploads (50MB max)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          property: error.property,
          message: error.constraints
            ? Object.values(error.constraints)[0]
            : 'Validation failed',
        }));
        return new BadRequestException(result);
      },
    }),
  );
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalInterceptors(new TransformInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Prime Auto API')
    .setDescription('The Prime Auto API description')
    .setVersion('1.0')
    .addTag('prime-auto')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  const env = process.env.NODE_ENV || 'development';
  if (env === 'development' || env === 'stage') {
    SwaggerModule.setup('docs', app, document, {
      customCssUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js',
      ],
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
