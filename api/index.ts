import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';

const server = express();
let cachedServer;

async function createServer() {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

    app.useGlobalPipes(new ValidationPipe());
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
        }
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
