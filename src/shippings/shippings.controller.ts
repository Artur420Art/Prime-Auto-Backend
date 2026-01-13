import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';

import { ShippingsService } from './shippings.service';
import { CreateCityPriceDto } from './dto/create-shipping.dto';
import { UpdateCityPriceDto } from './dto/update-city-price.dto';
import { AdjustPriceDto } from './dto/adjust-user-price.dto';
import { AdjustBasePriceDto } from './dto/adjust-base-price.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { Role } from '../users/enums/role.enum';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Shippings')
@Controller('shippings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingsController {
  constructor(private readonly shippingsService: ShippingsService) {}

  // ========================================
  // ADMIN ONLY - Base City Price Management
  // ========================================

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a base city price (Admin)' })
  createCityPrice(@Body() createCityPriceDto: CreateCityPriceDto) {
    return this.shippingsService.createCityPrice(createCityPriceDto);
  }

  @Get('admin/city-prices')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all base city prices (Admin)' })
  getAllCityPrices() {
    return this.shippingsService.getAllCityPrices();
  }

  /**
   * Get paginated base city prices (admin view)
   * Admin only
   *
   * GET /shippings/admin/city-prices/paginated?page=1&limit=10&search=los
   */
  @Get('admin/city-prices/paginated')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get paginated base city prices (Admin)' })
  getAllCityPricesPaginated(@Query() paginationQuery: PaginationQueryDto) {
    return this.shippingsService.getAllCityPricesPaginated(paginationQuery);
  }

  /**
   * Get base city prices by filters
   * Admin only
   *
   * GET /shippings/admin/city-prices/filter?city=Los Angeles&category=copart
   */
  @Get('admin/city-prices/filter')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get base city prices by filters (Admin)' })
  @ApiQuery({
    name: 'city',
    required: false,
    description: 'Filter by city name',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by auction category (e.g., copart, iaai)',
  })
  getCityPriceByFilters(
    @Query('city') city?: string,
    @Query('category') category?: string,
  ) {
    return this.shippingsService.getCityPriceByFilters({ city, category });
  }

  /**
   * Update a base city price
   * Admin only
   *
   * PATCH /shippings/admin/city-prices?city=Los Angeles&category=copart
   * Body: { base_price: 600 }
   */
  @Patch('admin/city-prices')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a base city price (Admin)' })
  @ApiQuery({
    name: 'city',
    required: false,
    description: 'Target city name',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Target auction category',
  })
  updateCityPrice(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Body() updateDto: UpdateCityPriceDto = {},
  ) {
    return this.shippingsService.updateCityPrice({
      city,
      category,
      updateDto,
    });
  }

  /**
   * Delete a base city price
   * Admin only
   *
   * DELETE /shippings/admin/city-prices/:id
   */
  @Delete('admin/city-prices/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a base city price (Admin)' })
  removeCityPrice(@Param('id') id: string) {
    return this.shippingsService.removeCityPrice(id);
  }

  /**
   * Get price summary (single object with adjustment, effective price, and date)
   * Admin only
   *
   * GET /shippings/admin/price-summary?city=Los Angeles&category=copart
   */
  @Get('admin/price-summary')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get price summary for a city/category (Admin)' })
  @ApiQuery({
    name: 'category',
    required: true,
    description: 'Auction category (e.g., copart, iaai)',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    description: 'City name',
  })
  getPriceSummary(
  @Query('category') category?: string,  
  @Query('city') city?: string,
  ) {
    return this.shippingsService.getPriceSummary({ city, category });
  }

  // ========================================
  // ADMIN ONLY - Adjust Base Prices
  // ========================================

  /**
   * Adjust base prices by category (optionally for specific city)
   * Admin only
   *
   * This increments/decrements base prices and stores the adjustment history.
   *
   * PATCH /shippings/adjust-base-price
   * Body: { category: "copart", adjustment_amount: 100 }
   * Or: { category: "copart", city: "Los Angeles", adjustment_amount: -50 }
   */
  @Patch('adjust-base-price')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Adjust base prices by category/city (Admin)' })
  adjustBasePrice(@Body() adjustDto: AdjustBasePriceDto) {
    return this.shippingsService.adjustBasePrice(adjustDto);
  }

  // ========================================
  // ROLE-AWARE - Price Adjustments
  // ========================================

  @Patch('adjust-price')
  @ApiOperation({ summary: "Adjust a user's price for a category" })
  adjustPrice(@Body() adjustDto: AdjustPriceDto, @Request() req: any) {
    const currentUserId = req.user.userId;
    const isAdmin = req.user.roles?.includes(Role.ADMIN);

    return this.shippingsService.adjustPrice({
      adjustDto,
      currentUserId,
      isAdmin,
    });
  }

  /**
   * Get user's adjustment for a category
   * - Returns current user's adjustment (from JWT token)
   *
   * GET /shippings/adjustment?category=copart
   */
  @Get('adjustment')
  @ApiOperation({ summary: "Get user's adjustment for a category" })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by auction category',
  })
  getAdjustment(@Query('category') category?: string, @Request() req?: any) {
    const currentUserId = req.user.userId;
    const isAdmin = req.user.roles?.includes(Role.ADMIN);

    return this.shippingsService.getAdjustment({
      currentUserId,
      isAdmin,
      userId: undefined,
      category,
    });
  }

  @Get('adjustments')
  @ApiOperation({ summary: 'Get all user adjustments' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by auction category',
  })
  getAllAdjustments(
    @Query('category') category?: string,
    @Request() req?: any,
  ) {
    const currentUserId = req.user.userId;
    const isAdmin = req.user.roles?.includes(Role.ADMIN);

    return this.shippingsService.getAllAdjustments({
      currentUserId,
      isAdmin,
      userId: undefined,
      category,
    });
  }

  // ========================================
  // ROLE-AWARE - Get Prices
  // ========================================

  @Get('prices')
  @ApiOperation({ summary: 'Get effective prices for current user' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by auction category',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    description: 'Filter by city name',
  })
  getPrices(
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Request() req?: any,
  ) {
    const currentUserId = req.user.userId;
    const isAdmin = req.user.roles?.includes(Role.ADMIN);

    return this.shippingsService.getPrices({
      currentUserId,
      isAdmin,
      userId: undefined,
      category,
      city,
    });
  }

  @Get('prices/paginated')
  @ApiOperation({ summary: 'Get paginated effective prices for current user' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by auction category',
  })
  getPricesPaginated(
    @Query() paginationQuery: PaginationQueryDto,
    @Query('category') category?: string,
    @Request() req?: any,
  ) {
    const currentUserId = req.user.userId;
    const isAdmin = req.user.roles?.includes(Role.ADMIN);

    return this.shippingsService.getPricesPaginated({
      currentUserId,
      isAdmin,
      userId: undefined,
      category,
      paginationQuery,
    });
  }

  // ========================================
  // ADMIN ONLY - User Specific Management
  // ========================================

  /**
   * Get effective prices for a specific user
   * Admin only
   *
   * GET /shippings/admin/user-prices/:userId?category=copart
   */
  @Get('admin/user-prices/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get effective prices for a specific user (Admin)' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by auction category',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    description: 'Filter by city name',
  })
  getUserPrices(
    @Param('userId') userId: string,
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Request() req?: any,
  ) {
    const currentUserId = req.user.userId;
    const isAdmin = true;

    return this.shippingsService.getPrices({
      currentUserId,
      isAdmin,
      userId,
      category,
      city,
    });
  }

  /**
   * Get adjustments for a specific user
   * Admin only
   *
   * GET /shippings/admin/user-adjustments/:userId?category=copart
   */
  @Get('admin/user-adjustments/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get adjustments for a specific user (Admin)' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by auction category',
  })
  getUserAdjustments(
    @Param('userId') userId: string,
    @Query('category') category?: string,
    @Request() req?: any,
  ) {
    const currentUserId = req.user.userId;
    const isAdmin = true;

    return this.shippingsService.getAllAdjustments({
      currentUserId,
      isAdmin,
      userId,
      category,
    });
  }
}
