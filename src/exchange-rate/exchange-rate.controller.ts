import { Controller, Get } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('exchange-rate')
@Controller('exchange-rate')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Get('amd-usd')
  @ApiOperation({ summary: 'Get the latest AMD/USD exchange rate' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved the exchange rate',
  })
  async getAmdUsdRate() {
    return this.exchangeRateService.getAmdUsdRate();
  }
}
