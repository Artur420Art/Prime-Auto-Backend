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

@ApiTags('shippings')
@ApiBearerAuth()
@Controller('shippings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingsController {
  constructor(private readonly shippingsService: ShippingsService) {}

  @Post('city-prices')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create base city price (Admin only)' })
  @ApiCreatedResponse({ type: CityPrice })
  createCityPrice(@Body() createCityPriceDto: CreateCityPriceDto) {
    return this.shippingsService.createCityPrice(createCityPriceDto);
  }

  @Get('city-prices')
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

  @Patch('city-prices/:city/:category')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update a city price by city and category (Admin only)',
  })
  @ApiOkResponse({ type: CityPrice })
  updateCityPrice(
    @Param('city') city: string,
    @Param('category') category: string,
    @Body() updateCityPriceDto: UpdateCityPriceDto,
  ) {
    return this.shippingsService.updateCityPrice({
      city,
      category,
      updateDto: updateCityPriceDto,
    });
  }

  @Delete('city-prices/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a city price (Admin only)' })
  @ApiOkResponse({ description: 'City price deleted successfully' })
  removeCityPrice(@Param('id') id: string) {
    return this.shippingsService.removeCityPrice(id);
  }

  @Get('user-shippings')
  @ApiOperation({ summary: 'Get all user shipping customizations' })
  @ApiOkResponse({ type: [UserShipping] })
  findAllUserShippings(@Request() req) {
    return this.shippingsService.findAllUserShippings(req.user);
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
