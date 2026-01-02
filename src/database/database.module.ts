import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [],
      useFactory: async () => ({ uri: process.env.MONGODB_URI }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
