import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';

const server = express();
let cachedServer;

async function createServer() {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

    if (process.env.NODE_ENV === 'stage') {
      const config = new DocumentBuilder()
        .setTitle('Prime Auto API')
        .setDescription('Internal API docs')
        .setVersion('1.0')
        .addTag('prime-auto')
        .build();

      const document = SwaggerModule.createDocument(app, config);

      SwaggerModule.setup('docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
        },
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
