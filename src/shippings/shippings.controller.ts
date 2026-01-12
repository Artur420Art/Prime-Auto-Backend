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
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { ShippingsService } from './shippings.service';
import { CreateCityPriceDto } from './dto/create-shipping.dto';
import { UpdateCityPriceDto } from './dto/update-city-price.dto';
import { AdjustUserPricesDto } from './dto/update-price.dto';
import { AdjustBasePriceDto } from './dto/adjust-base-price.dto';
import { AdminAdjustUserPriceDto } from './dto/admin-adjust-user-price.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { CityPrice } from './schemas/city-price.schema';
import { UserCategoryAdjustment } from './schemas/user-category-adjustment.schema';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('shippings')
@ApiBearerAuth()
@Controller('shippings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingsController {
  constructor(private readonly shippingsService: ShippingsService) {}

  // ========================================
  // ADMIN - City Price Management
  // ========================================

  @Post('')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create base city price (Admin only)' })
  @ApiCreatedResponse({ type: CityPrice })
  createCityPrice(@Body() createCityPriceDto: CreateCityPriceDto) {
    return this.shippingsService.createCityPrice(createCityPriceDto);
  }

  @Get('')
  @ApiOperation({ summary: 'Get all city prices (base prices)' })
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
  @ApiOperation({ summary: 'Get paginated city prices (base prices)' })
  getAllCityPricesPaginated(@Query() paginationQuery: PaginationQueryDto) {
    return this.shippingsService.getAllCityPricesPaginated(paginationQuery);
  }

  @Patch('')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a city price (Admin only)' })
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

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a city price (Admin only)' })
  @ApiOkResponse({ description: 'City price deleted successfully' })
  removeCityPrice(@Param('id') id: string) {
    return this.shippingsService.removeCityPrice(id);
  }

  // ========================================
  // ADMIN - Adjust Base Price (all users)
  // ========================================

  @Patch('admin/adjust-base-price')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Admin adjusts base price for all (stores last_adjustment_amount). If city not provided, applies to all cities in category.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { modifiedCount: { type: 'number' } },
    },
  })
  adjustBasePrice(@Body() adjustBasePriceDto: AdjustBasePriceDto) {
    return this.shippingsService.adjustBasePrice(adjustBasePriceDto);
  }

  // ========================================
  // ADMIN - Adjust Specific User's Price
  // ========================================

  @Patch('admin/adjust-user-price')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Admin adjusts price for a specific user (stores adjustment for that user)',
  })
  @ApiOkResponse({ type: UserCategoryAdjustment })
  adminAdjustUserPrice(@Body() adjustDto: AdminAdjustUserPriceDto) {
    return this.shippingsService.adminAdjustUserPrice(adjustDto);
  }

  @Get('admin/adjustments')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin gets all user adjustments' })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiOkResponse({ type: [UserCategoryAdjustment] })
  getAllAdjustments(@Query('category') category?: string) {
    return this.shippingsService.getAllAdjustments(category);
  }

  @Get('admin/adjustments/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin gets adjustments for a specific user' })
  @ApiOkResponse({ type: [UserCategoryAdjustment] })
  getAdjustmentsByUserId(@Param('userId') userId: string) {
    return this.shippingsService.getAdjustmentsByUserId(userId);
  }

  // ========================================
  // USER - Adjust Own Price
  // ========================================

  @Patch('user/adjust-prices')
  @ApiOperation({
    summary: 'User adjusts their own price for a category (stores adjustment)',
  })
  @ApiOkResponse({ type: UserCategoryAdjustment })
  adjustUserPrices(@Body() adjustDto: AdjustUserPricesDto, @Request() req) {
    return this.shippingsService.adjustUserPrices({
      adjustDto,
      userId: req.user.userId,
    });
  }

  @Get('user/adjustment')
  @ApiOperation({ summary: 'Get user adjustment for a category' })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['copart', 'iaai', 'manheim'],
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        adjustment_amount: { type: 'number' },
        adjusted_by: {
          type: 'string',
          enum: ['user', 'admin'],
          nullable: true,
        },
        last_adjustment_amount: { type: 'number', nullable: true },
        last_adjustment_date: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
      },
    },
  })
  getUserAdjustment(@Request() req, @Query('category') category?: string) {
    return this.shippingsService.getUserAdjustment({
      userId: req.user.userId,
      category,
    });
  }

  @Get('user/adjustments')
  @ApiOperation({ summary: 'Get all user adjustments (all categories)' })
  @ApiOkResponse({ type: [UserCategoryAdjustment] })
  getAllUserAdjustments(@Request() req) {
    return this.shippingsService.getAllUserAdjustments(req.user.userId);
  }

  // ========================================
  // USER - Get Calculated Prices
  // ========================================

  @Get('user/prices')
  @ApiOperation({
    summary: 'Get all effective prices for user (base_price + user_adjustment)',
  })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          category: { type: 'string' },
          base_price: { type: 'number' },
          base_last_adjustment_amount: { type: 'number', nullable: true },
          base_last_adjustment_date: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
          user_adjustment_amount: { type: 'number' },
          adjusted_by: {
            type: 'string',
            enum: ['user', 'admin'],
            nullable: true,
          },
          effective_price: { type: 'number' },
        },
      },
    },
  })
  getUserPrices(
    @Request() req,
    @Query('category') category?: string,
    @Query('city') city?: string,
  ) {
    return this.shippingsService.getUserPrices({
      userId: req.user.userId,
      category,
      city,
    });
  }

  @Get('user/prices/paginated')
  @ApiOperation({ summary: 'Get paginated effective prices for user' })
  @ApiQuery({ name: 'category', required: false, type: String })
  getUserPricesPaginated(
    @Request() req,
    @Query() paginationQuery: PaginationQueryDto,
    @Query('category') category?: string,
  ) {
    return this.shippingsService.getUserPricesPaginated({
      userId: req.user.userId,
      category,
      paginationQuery,
    });
  }

  @Get('user/prices/:city/:category')
  @ApiOperation({
    summary: 'Get effective price for specific city and category',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        base_price: { type: 'number' },
        base_last_adjustment_amount: { type: 'number', nullable: true },
        base_last_adjustment_date: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        user_adjustment_amount: { type: 'number' },
        adjusted_by: {
          type: 'string',
          enum: ['user', 'admin'],
          nullable: true,
        },
        user_last_adjustment_amount: { type: 'number', nullable: true },
        user_last_adjustment_date: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        effective_price: { type: 'number' },
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
