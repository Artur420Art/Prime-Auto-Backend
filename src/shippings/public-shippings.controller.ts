import { Controller, Get, Query } from '@nestjs/common';

import { ShippingsService } from './shippings.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Public Shippings')
@Controller('public')
export class PublicShippingsController {
  constructor(private readonly shippingsService: ShippingsService) {}

  @Get('cities')
  @ApiOperation({
    summary: 'Get all cities grouped by category (Public - No Auth Required)',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Auction category (e.g. copart, iaai)',
  })
  getCitiesByCategory(@Query('category') category?: string) {
    return this.shippingsService.getCitiesByCategory(category);
  }
}
