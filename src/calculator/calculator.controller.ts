import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { VehicleTaxesQueryDto } from './dto/vehicle-taxes-query.dto';
import { CalculatorService } from './calculator.service';

@ApiTags('calculator')
@Controller('calculator')
export class CalculatorController {
  constructor(private readonly calculatorService: CalculatorService) {}

  @Get('vehicle-taxes')
  @ApiOperation({
    summary:
      'Calculate vehicle import taxes (proxy to src.am; returns EUR numbers)',
  })
  @ApiResponse({
    status: 200,
    description: 'Calculator result',
    example: {
      globTax: 1821.3,
      envTaxPay: 242.84,
      nds: 2792.66,
      sumPay: 4856.8,
      type: '1',
    },
  })
  calculateVehicleTaxes(@Query() query: VehicleTaxesQueryDto) {
    return this.calculatorService.calculateVehicleTaxes({ query });
  }
}
