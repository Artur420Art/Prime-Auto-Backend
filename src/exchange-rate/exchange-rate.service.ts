import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly apiUrl = 'https://cb.am/latest.json.php?currency=USD';

  constructor(private readonly httpService: HttpService) {}

  async getAmdUsdRate(): Promise<any> {
    this.logger.log('Fetching AMD/USD exchange rate from external API');
    try {
      const { data } = await firstValueFrom(this.httpService.get(this.apiUrl));
      this.logger.log('Successfully fetched exchange rate');
      return data;
    } catch (error) {
      this.logger.error(`Error fetching exchange rate: ${error.message}`);
      throw error;
    }
  }
}
