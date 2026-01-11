import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [],
      useFactory: async () => ({
        uri: process.env.MONGODB_URI,
        // Connection pool configuration for optimal performance
        maxPoolSize: 50, // Maximum number of connections in the pool
        minPoolSize: 10, // Minimum number of connections to maintain
        // Connection timeout settings
        serverSelectionTimeoutMS: 5000, // Timeout for server selection (5 seconds)
        socketTimeoutMS: 45000, // Socket timeout (45 seconds)
        connectTimeoutMS: 10000, // Initial connection timeout (10 seconds)
        // Performance optimizations
        maxIdleTimeMS: 300000, // Close connections that are idle for 5 minutes
        // Retry configuration
        retryWrites: true,
        retryReads: true,
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
