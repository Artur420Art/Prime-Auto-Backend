import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ExchangeRateService } from './exchange-rate.service';
import { ExchangeRateController } from './exchange-rate.controller';

@Module({
  imports: [HttpModule],
  providers: [ExchangeRateService],
  controllers: [ExchangeRateController],
  exports: [ExchangeRateService],
})
export class ExchangeRateModule {}
