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
import { AdjustPriceDto } from './dto/adjust-user-price.dto';
import { AdjustBasePriceDto } from './dto/adjust-base-price.dto';
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

  // Helper to check if user is admin
  private isAdmin(req: { user: { roles: string[] } }): boolean {
    return req.user.roles?.includes('admin') || false;
  }

  // ========================================
  // Base City Price Management (Admin only)
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

  @Patch('adjust-base-price')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Adjust base price for category (Admin only)',
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
  // User Price Adjustment (Role-aware)
  // ========================================

  @Patch('adjust-price')
  @ApiOperation({
    summary:
      'Adjust price for category. Admin can specify userId, user adjusts own price.',
  })
  @ApiOkResponse({ type: UserCategoryAdjustment })
  adjustPrice(@Body() adjustDto: AdjustPriceDto, @Request() req) {
    return this.shippingsService.adjustPrice({
      adjustDto,
      currentUserId: req.user.userId,
      isAdmin: this.isAdmin(req),
    });
  }

  @Get('adjustment')
  @ApiOperation({
    summary: 'Get adjustment. Admin can specify userId, user gets own.',
  })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
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
  getAdjustment(
    @Request() req,
    @Query('category') category?: string,
    @Query('userId') userId?: string,
  ) {
    return this.shippingsService.getAdjustment({
      currentUserId: req.user.userId,
      isAdmin: this.isAdmin(req),
      userId,
      category,
    });
  }

  @Get('adjustments')
  @ApiOperation({
    summary:
      'Get all adjustments. Admin sees all (or filter by userId), user sees own.',
  })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiOkResponse({ type: [UserCategoryAdjustment] })
  getAllAdjustments(
    @Request() req,
    @Query('category') category?: string,
    @Query('userId') userId?: string,
  ) {
    return this.shippingsService.getAllAdjustments({
      currentUserId: req.user.userId,
      isAdmin: this.isAdmin(req),
      userId,
      category,
    });
  }

  // ========================================
  // Get Prices (Role-aware)
  // ========================================

  @Get('prices')
  @ApiOperation({
    summary: 'Get effective prices. Admin can specify userId, user gets own.',
  })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
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
  getPrices(
    @Request() req,
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('userId') userId?: string,
  ) {
    return this.shippingsService.getPrices({
      currentUserId: req.user.userId,
      isAdmin: this.isAdmin(req),
      userId,
      category,
      city,
    });
  }

  @Get('prices/paginated')
  @ApiOperation({ summary: 'Get paginated effective prices (role-aware)' })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  getPricesPaginated(
    @Request() req,
    @Query() paginationQuery: PaginationQueryDto,
    @Query('category') category?: string,
    @Query('userId') userId?: string,
  ) {
    return this.shippingsService.getPricesPaginated({
      currentUserId: req.user.userId,
      isAdmin: this.isAdmin(req),
      userId,
      category,
      paginationQuery,
    });
  }

  @Get('prices/:city/:category')
  @ApiOperation({
    summary: 'Get effective price for city/category (role-aware)',
  })
  @ApiQuery({ name: 'userId', required: false, type: String })
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
    @Query('userId') userId?: string,
  ) {
    return this.shippingsService.getEffectivePrice({
      currentUserId: req.user.userId,
      isAdmin: this.isAdmin(req),
      userId,
      city,
      category,
    });
  }
}
