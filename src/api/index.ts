import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import express from 'express';

const server = express();
let cachedServer;

async function createServer() {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
    app.enableCors();

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
    const env = process.env.NODE_ENV || 'development';
    if (env === 'development' || env === 'stage' || process.env.VERCEL) {
      const config = new DocumentBuilder()
        .setTitle('Prime Auto API')
        .setDescription('Internal API docs')
        .setVersion('1.0')
        .addTag('prime-auto')
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, config);

      SwaggerModule.setup('docs', app, document, {
        useGlobalPrefix: true,
        swaggerOptions: {
          persistAuthorization: true,
        },
        customCssUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
        customJs: [
          'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
          'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js',
        ],
      });
    }
    await app.init();
    cachedServer = server;
  }

  return cachedServer;
}

export default async function handler(req, res) {
  const app = await createServer();
  app(req, res);
}
