import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ShippingsService } from './shippings.service';
import { CreateCityPriceDto } from './dto/create-shipping.dto';
import { UpdateCityPriceDto } from './dto/update-city-price.dto';
import { UpdateDefaultPriceDto } from './dto/update-default-price.dto';
import { BulkUpdateDefaultPriceDto } from './dto/bulk-update-default-price.dto';
import { AdjustUserPricesDto } from './dto/update-price.dto';
import { AdjustBasePriceDto } from './dto/adjust-base-price.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { Role } from '../users/enums/role.enum';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UserShipping } from './schemas/shipping.schema';
import { CityPrice } from './schemas/city-price.schema';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/pagination-response.dto';

@ApiTags('shippings')
@ApiBearerAuth()
@Controller('shippings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingsController {
  constructor(private readonly shippingsService: ShippingsService) {}

  @Post('')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create base city price (Admin only)' })
  @ApiCreatedResponse({ type: CityPrice })
  createCityPrice(@Body() createCityPriceDto: CreateCityPriceDto) {
    return this.shippingsService.createCityPrice(createCityPriceDto);
  }

  @Get('')
  @ApiOperation({ summary: 'Get all city prices' })
  @ApiOkResponse({ type: [CityPrice] })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  getAllCityPrices(
    @Query('category') category?: string,
    @Query('city') city?: string,
  ) {
    if (city || category) {
      return this.shippingsService.getCityPriceByFilters({ city, category });
    }
    return this.shippingsService.getAllCityPrices();
  }

  @Get('paginated')
  @ApiOperation({ summary: 'Get paginated city prices' })
  @ApiOkResponse({ type: PaginatedResponseDto<CityPrice> })
  getAllCityPricesPaginated(@Query() paginationQuery: PaginationQueryDto) {
    return this.shippingsService.getAllCityPricesPaginated(paginationQuery);
  }

  @Patch('')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update a city price by city and category (Admin only)',
  })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiOkResponse({ type: CityPrice })
  updateCityPrice(
    @Body() updateCityPriceDto: UpdateCityPriceDto,
    @Query('city') city?: string,
    @Query('category') category?: string,
  ) {
    return this.shippingsService.updateCityPrice({
      city,
      category,
      updateDto: updateCityPriceDto,
    });
  }

  @Delete('/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a city price (Admin only)' })
  @ApiOkResponse({ description: 'City price deleted successfully' })
  removeCityPrice(@Param('id') id: string) {
    return this.shippingsService.removeCityPrice(id);
  }

  @Patch('adjust-base-price')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Adjust base price by amount for a category (Admin only). If city not provided, applies to all cities.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        modifiedCount: { type: 'number' },
      },
    },
  })
  adjustBasePrice(@Body() adjustBasePriceDto: AdjustBasePriceDto) {
    return this.shippingsService.adjustBasePrice(adjustBasePriceDto);
  }

  @Get('user-shippings')
  @ApiOperation({ summary: 'Get all user shipping customizations' })
  @ApiOkResponse({ type: [UserShipping] })
  findAllUserShippings(@Request() req) {
    return this.shippingsService.findAllUserShippings(req.user);
  }

  @Get('user-shippings/paginated')
  @ApiOperation({ summary: 'Get paginated user shipping customizations' })
  @ApiOkResponse({ type: PaginatedResponseDto<UserShipping> })
  findAllUserShippingsPaginated(
    @Request() req,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.shippingsService.findAllUserShippingsPaginated({
      user: req.user,
      paginationQuery,
    });
  }

  @Get('user-shippings/city/:city')
  @ApiOperation({ summary: 'Get user shippings by city' })
  @ApiOkResponse({ type: [UserShipping] })
  findUserShippingsByCity(@Param('city') city: string, @Request() req) {
    return this.shippingsService.findUserShippingsByCity(city, req.user);
  }

  @Get('user-shippings/city/:city/category/:category')
  @ApiOperation({ summary: 'Get user shippings by city and category' })
  @ApiOkResponse({ type: [UserShipping] })
  findUserShippingsByCityAndCategory(
    @Param('city') city: string,
    @Param('category') category: string,
    @Request() req,
  ) {
    return this.shippingsService.findUserShippingsByCityAndCategory(
      city,
      category,
      req.user,
    );
  }

  @Get('user-shippings/:id')
  @ApiOperation({ summary: 'Get a user shipping by ID' })
  @ApiOkResponse({ type: UserShipping })
  findOneUserShipping(@Param('id') id: string) {
    return this.shippingsService.findOneUserShipping(id);
  }

  @Delete('user-shippings/:id')
  @ApiOperation({ summary: 'Delete a user shipping customization' })
  @ApiOkResponse({ description: 'User shipping deleted successfully' })
  removeUserShipping(@Param('id') id: string) {
    return this.shippingsService.removeUserShipping(id);
  }

  @Patch('admin/default-price')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Admin updates default_price for a specific user, city, and category',
  })
  @ApiOkResponse({ type: UserShipping })
  updateDefaultPrice(@Body() updateDto: UpdateDefaultPriceDto) {
    return this.shippingsService.updateDefaultPrice(updateDto);
  }

  @Patch('admin/bulk-default-price')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Admin bulk updates default_price for all users (optionally filtered by city/category)',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        modifiedCount: { type: 'number' },
      },
    },
  })
  bulkUpdateDefaultPrice(
    @Body() updateDto: BulkUpdateDefaultPriceDto,
    @Query('userId') userId?: string,
  ) {
    return this.shippingsService.bulkUpdateDefaultPrice({ updateDto, userId });
  }

  @Patch('user/adjust-prices')
  @ApiOperation({
    summary:
      'User adjusts ALL their city prices by a fixed amount (+ to increase, - to decrease)',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        modifiedCount: { type: 'number' },
      },
    },
  })
  adjustUserPrices(@Body() adjustDto: AdjustUserPricesDto, @Request() req) {
    return this.shippingsService.adjustUserPrices({
      adjustDto,
      userId: req.user.userId,
    });
  }

  @Get('effective-price/:city/:category')
  @ApiOperation({
    summary:
      'Get effective price breakdown for a city and category (user-specific)',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        base_price: { type: 'number' },
        default_price: { type: 'number' },
        price_adjustment: { type: 'number' },
        last_adjustment_amount: { type: 'number' },
        last_adjustment_date: { type: 'string', format: 'date-time' },
        current_price: { type: 'number' },
        source: {
          type: 'string',
          enum: ['base', 'admin_default', 'user_adjusted'],
        },
      },
    },
  })
  getEffectivePrice(
    @Param('city') city: string,
    @Param('category') category: string,
    @Request() req,
  ) {
    return this.shippingsService.getEffectivePrice(
      req.user.userId,
      city,
      category,
    );
  }
}
