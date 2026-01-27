import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { VehicleTaxesQueryDto } from './dto/vehicle-taxes-query.dto';
import { SrcAmVehicleTaxesResponse } from './types/src-am-vehicle-taxes.type';
import { normalizeSrcAmProductionDate } from './utils/normalize-srcam-production-date.util';

@Injectable()
export class CalculatorService {
  private readonly logger = new Logger(CalculatorService.name);
  private readonly srcAmUrl = 'https://www.src.am/am/showVehiclesSearchResult';

  constructor(private readonly httpService: HttpService) {}

  public readonly calculateVehicleTaxes = async ({
    query,
  }: {
    query: VehicleTaxesQueryDto;
  }): Promise<SrcAmVehicleTaxesResponse> => {
    const productionDate = this.safeNormalizeDate({ date: query.date });

    const params = {
      productionDate,
      value: query.price,
      volume: query.volume,
      selectedEngineType: query.engineType,
      isLegal: query.isLegal ?? 1,
      offRoad: query.offRoad ?? 0,
      ICEpower: query.ICEpower ?? 0,
    };

    this.logger.log(
      `Calling src.am calculator with params: ${JSON.stringify(params)}`,
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<SrcAmVehicleTaxesResponse>(this.srcAmUrl, {
          params,
        }),
      );

      return data;
    } catch (error) {
      this.logger.error(`src.am calculator error: ${error?.message ?? error}`);
      throw new BadGatewayException('Calculator service is unavailable');
    }
  };

  private readonly safeNormalizeDate = ({ date }: { date: string }) => {
    try {
      return normalizeSrcAmProductionDate({ date });
    } catch {
      throw new BadRequestException([
        {
          property: 'date',
          message:
            'Invalid date. Use DD-MM-YYYY (e.g. 27-01-2026), YYYY-MM-DD, or full ISO timestamp.',
        },
      ]);
    }
  };
}
