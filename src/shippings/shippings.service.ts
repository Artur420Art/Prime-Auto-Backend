import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';

import { CityPrice } from './schemas/city-price.schema';
import {
  UserCategoryAdjustment,
  AdjustedBy,
} from './schemas/user-category-adjustment.schema';
import { CreateCityPriceDto } from './dto/create-shipping.dto';
import { UpdateCityPriceDto } from './dto/update-city-price.dto';
import { AdjustPriceDto } from './dto/adjust-user-price.dto';
import { AdjustBasePriceDto } from './dto/adjust-base-price.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

/**
 * ShippingsService
 *
 * Manages shipping prices with three layers:
 * 1. Base City Prices (CityPrice) - Set by admin for each city/category
 * 2. User Category Adjustments (UserCategoryAdjustment) - Per-user adjustments by category
 * 3. Effective Price = Base Price + User Adjustment
 *
 * Features:
 * - Admin can create/update base city prices
 * - Admin can adjust base prices by category (with history tracking)
 * - Admin can set specific user adjustments
 * - Users can set their own adjustments by category (applies to all cities)
 * - Role-aware endpoints return appropriate data
 */
@Injectable()
export class ShippingsService {
  private readonly logger = new Logger(ShippingsService.name);

  constructor(
    @InjectModel(CityPrice.name)
    private cityPriceModel: Model<CityPrice>,
    @InjectModel(UserCategoryAdjustment.name)
    private userCategoryAdjustmentModel: Model<UserCategoryAdjustment>,
  ) {}

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Builds a filter query for city prices
   */
  private buildCityPriceQuery({
    city,
    category,
    search,
  }: {
    city?: string;
    category?: string;
    search?: string;
  }): FilterQuery<CityPrice> {
    const query: FilterQuery<CityPrice> = {};
    if (city) query.city = new RegExp(`^${city}$`, 'i');
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { city: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }
    return query;
  }

  /**
   * Creates an adjustment map for efficient lookup
   */
  private createAdjustmentMap(
    adjustments: any[],
  ): Map<
    string,
    {
      adjustment_amount: number;
      user_adjustment_amount: number;
      admin_adjustment_amount: number;
      adjusted_by: AdjustedBy | null;
    }
  > {
    return new Map(
      adjustments.map((adj) => [
        adj.category,
        {
          adjustment_amount: adj.adjustment_amount || 0,
          user_adjustment_amount: adj.user_adjustment_amount || 0,
          admin_adjustment_amount: adj.admin_adjustment_amount || 0,
          adjusted_by: adj.adjusted_by,
        },
      ]),
    );
  }

  /**
   * Calculates effective price with adjustment details
   */
  private calculateEffectivePrice({
    cityPrice,
    adjustmentMap,
  }: {
    cityPrice: any;
    adjustmentMap: Map<
      string,
      {
        adjustment_amount: number;
        user_adjustment_amount: number;
        admin_adjustment_amount: number;
        adjusted_by: AdjustedBy | null;
      }
    >;
  }) {
    const userAdj = adjustmentMap.get(cityPrice.category) || {
      adjustment_amount: 0,
      user_adjustment_amount: 0,
      admin_adjustment_amount: 0,
      adjusted_by: null,
    };
    const totalAdjustment =
      userAdj.user_adjustment_amount + userAdj.admin_adjustment_amount;
    return {
      _id: cityPrice._id,
      city: cityPrice.city,
      category: cityPrice.category,
      base_price: cityPrice.base_price,
      base_last_adjustment_amount: cityPrice.last_adjustment_amount,
      base_last_adjustment_date: cityPrice.last_adjustment_date,
      user_adjustment_amount: userAdj.user_adjustment_amount,
      admin_adjustment_amount: userAdj.admin_adjustment_amount,
      total_adjustment_amount: totalAdjustment,
      adjusted_by: userAdj.adjusted_by,
      effective_price: cityPrice.base_price + totalAdjustment,
    };
  }

  // ========================================
  // CITY PRICE - Base prices
  // ========================================

  async createCityPrice(createCityPriceDto: CreateCityPriceDto) {
    this.logger.log(
      `Creating city price: city ${createCityPriceDto.city}, category: ${createCityPriceDto.category}`,
    );
    const createdCityPrice = new this.cityPriceModel({
      city: createCityPriceDto.city,
      category: createCityPriceDto.category,
      base_price: createCityPriceDto.base_price,
    });
    return createdCityPrice.save();
  }

  async getAllCityPrices() {
    this.logger.log('Fetching all city prices');
    return this.cityPriceModel.find().lean().exec();
  }

  async getAllCityPricesPaginated(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10, search } = paginationQuery;
    this.logger.log(
      `Fetching city prices with pagination - page: ${page}, limit: ${limit}`,
    );

    const query = this.buildCityPriceQuery({ search });
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      this.cityPriceModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ city: 1 })
        .lean()
        .exec(),
      this.cityPriceModel.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getCityPriceByFilters({
    city,
    category,
  }: {
    city?: string;
    category?: string;
  }) {
    this.logger.log(
      `Fetching city prices with filters: city=${city}, category=${category}`,
    );
    const query = this.buildCityPriceQuery({ city, category });
    return this.cityPriceModel.find(query).lean().exec();
  }

  async updateCityPrice({
    city,
    category,
    updateDto,
  }: {
    city?: string;
    category?: string;
    updateDto: UpdateCityPriceDto;
  }) {
    this.logger.log(
      `Updating city price for city: ${city}, category: ${category}`,
    );

    const query = this.buildCityPriceQuery({ city, category });

    const cityPrice = await this.cityPriceModel
      .findOneAndUpdate(query, updateDto, { new: true })
      .exec();

    if (!cityPrice) {
      const filters = [
        city && `city "${city}"`,
        category && `category "${category}"`,
      ]
        .filter(Boolean)
        .join(' and ');
      throw new NotFoundException(
        `City price not found for ${filters || 'given filters'}`,
      );
    }
    return cityPrice;
  }

  async removeCityPrice(id: string): Promise<void> {
    this.logger.log(`Removing city price with ID ${id}`);
    const result = await this.cityPriceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`City price with ID "${id}" not found`);
    }
  }

  /**
   * Gets price summary for a category
   * - Admin: returns base_price and base_adjustment info
   * - User: returns their own user adjustment info (both user and admin adjustments)
   *
   * @param category - Auction category
   * @param currentUserId - ID of current user
   * @param isAdmin - Whether user is admin
   * @returns Different data based on role
   */
  async getPriceSummary({
    category,
    currentUserId,
    isAdmin,
  }: {
    category: string;
    currentUserId: string;
    isAdmin: boolean;
  }) {
    this.logger.log(
      `Getting price summary for category: ${category}, user: ${currentUserId}, isAdmin: ${isAdmin}`,
    );

    if (isAdmin) {
      // Admin: return base price and base adjustment info
      const cityPrice = await this.cityPriceModel
        .findOne({ category })
        .sort({ last_adjustment_date: -1 })
        .lean()
        .exec();

      if (!cityPrice) {
        throw new NotFoundException(
          `No prices found for category "${category}"`,
        );
      }

      return {
        base_price: cityPrice.base_price,
        base_adjustment_amount: cityPrice.last_adjustment_amount || 0,
        last_adjustment_date: cityPrice.last_adjustment_date || null,
      };
    } else {
      // User: return their own adjustment info
      const userAdjustment = await this.userCategoryAdjustmentModel
        .findOne({
          user: currentUserId,
          category,
        })
        .lean()
        .exec();

      if (!userAdjustment) {
        // Return default values if user has no adjustment for this category
        return {
          user_adjustment_amount: 0,
          admin_adjustment_amount: 0,
          total_adjustment_amount: 0,
        };
      }

      const userAmount = userAdjustment.user_adjustment_amount || 0;
      const adminAmount = userAdjustment.admin_adjustment_amount || 0;

      return {
        user_adjustment_amount: userAmount,
        admin_adjustment_amount: adminAmount,
        total_adjustment_amount: userAmount + adminAmount,
      };
    }
  }

  // ========================================
  // Adjust Base Price (Admin only)
  // ========================================

  /**
   * Adjusts base prices for a category (optionally for a specific city)
   * - Increments/decrements the base_price
   * - Stores the adjustment amount and date for tracking
   * - Admin can see this history to know what changes were made
   *
   * @param adjustDto - Contains category, optional city, and adjustment amount
   * @returns Number of modified records
   */
  async adjustBasePrice(adjustDto: AdjustBasePriceDto) {
    const { category, city, adjustment_amount } = adjustDto;
    this.logger.log(
      `Admin adjusting base price by ${adjustment_amount} for category: ${category}, city: ${city || 'all cities'}`,
    );

    const query = this.buildCityPriceQuery({ city, category });

    // Update base prices and track the adjustment
    const result = await this.cityPriceModel
      .updateMany(query, {
        $inc: { base_price: adjustment_amount },
        $set: {
          last_adjustment_amount: adjustment_amount,
          last_adjustment_date: new Date(),
        },
      })
      .exec();

    if (result.matchedCount === 0) {
      const filterDesc = city
        ? `city "${city}" and category "${category}"`
        : `category "${category}"`;
      throw new NotFoundException(`No city prices found for ${filterDesc}`);
    }

    this.logger.log(
      `Adjusted base price for ${result.modifiedCount} city prices`,
    );

    return {
      modifiedCount: result.modifiedCount,
      category,
      city: city || 'all',
      adjustment_amount,
    };
  }

  // ========================================
  // Adjust User Price (Role-aware)
  // ========================================

  /**
   * Sets a user's price adjustment for a category
   * - Admin can adjust any user's price (by providing userId) - stored in admin_adjustment_amount
   * - User can only adjust their own price - stored in user_adjustment_amount
   * - Both adjustments are stored separately and combined for effective price
   * - Adjustment applies to ALL cities in that category
   *
   * Example: If user sets user_adjustment_amount=50 and admin sets admin_adjustment_amount=100 for "copart",
   * all copart cities will have +150 added to their base price for that user
   *
   * @param adjustDto - Contains category, adjustment amount, and optional userId
   * @param currentUserId - ID of the requesting user
   * @param isAdmin - Whether the requester is an admin
   * @returns Updated adjustment record
   */
  async adjustPrice({
    adjustDto,
    currentUserId,
    isAdmin,
  }: {
    adjustDto: AdjustPriceDto;
    currentUserId: string;
    isAdmin: boolean;
  }) {
    const { category, adjustment_amount, userId } = adjustDto;

    // Determine target user and who is adjusting
    const targetUserId = isAdmin && userId ? userId : currentUserId;
    const adjustedBy = isAdmin && userId ? AdjustedBy.ADMIN : AdjustedBy.USER;

    this.logger.log(
      `${adjustedBy} adjusting price for user ${targetUserId}, category: ${category}, amount: ${adjustment_amount}`,
    );

    const updateFields: Record<string, unknown> = {
      adjusted_by: adjustedBy,
    };

    if (adjustedBy === AdjustedBy.ADMIN) {
      // Admin is adjusting - update admin_adjustment_amount
      updateFields.admin_adjustment_amount = adjustment_amount;
    } else {
      // User is adjusting - update user_adjustment_amount
      updateFields.user_adjustment_amount = adjustment_amount;
    }

    const result = await this.userCategoryAdjustmentModel
      .findOneAndUpdate(
        { user: targetUserId, category },
        { $set: updateFields },
        { upsert: true, new: true },
      )
      .populate('user', 'firstName lastName email')
      .exec();

    this.logger.log(
      `Successfully adjusted price for user ${targetUserId}, category: ${category}`,
    );

    return result;
  }

  // ========================================
  // Get Adjustments (Role-aware)
  // ========================================

  async getAdjustment({
    currentUserId,
    isAdmin,
    userId,
    category,
  }: {
    currentUserId: string;
    isAdmin: boolean;
    userId?: string;
    category?: string;
  }) {
    // Admin can view any user, regular user can only view their own
    const targetUserId = isAdmin && userId ? userId : currentUserId;

    this.logger.log(
      `Getting adjustment for user ${targetUserId}, category: ${category || 'any'}`,
    );

    const query: FilterQuery<UserCategoryAdjustment> = { user: targetUserId };
    if (category) {
      query.category = category;
    }

    const adjustment = await this.userCategoryAdjustmentModel
      .findOne(query)
      .lean()
      .exec();

    if (!adjustment) {
      return {
        user_adjustment_amount: 0,
        admin_adjustment_amount: 0,
        total_adjustment_amount: 0,
        adjusted_by: null,
      };
    }

    const userAdjustment = adjustment.user_adjustment_amount || 0;
    const adminAdjustment = adjustment.admin_adjustment_amount || 0;

    return {
      user_adjustment_amount: userAdjustment,
      admin_adjustment_amount: adminAdjustment,
      total_adjustment_amount: userAdjustment + adminAdjustment,
      adjusted_by: adjustment.adjusted_by,
    };
  }

  async getAllAdjustments({
    currentUserId,
    isAdmin,
    userId,
    category,
  }: {
    currentUserId: string;
    isAdmin: boolean;
    userId?: string;
    category?: string;
  }) {
    // Admin can view all or specific user, regular user sees only their own
    const query: FilterQuery<UserCategoryAdjustment> = {};

    if (isAdmin) {
      if (userId) {
        query.user = userId;
      }
      // If no userId, admin sees all
    } else {
      query.user = currentUserId;
    }

    if (category) {
      query.category = category;
    }

    this.logger.log(`Getting adjustments with query: ${JSON.stringify(query)}`);

    return this.userCategoryAdjustmentModel
      .find(query)
      .populate('user', 'firstName lastName email')
      .lean()
      .exec();
  }

  // ========================================
  // Get Prices (Role-aware)
  // ========================================

  /**
   * Gets effective prices for a user
   * - Admin can view any user's prices by providing userId
   * - Regular user sees only their own prices
   * - Returns base price + user adjustment = effective price
   * - Shows adjustment history for both base and user adjustments
   *
   * Response includes:
   * - base_price: Original price set by admin
   * - base_last_adjustment_amount: Last admin adjustment to base price
   * - base_last_adjustment_date: When base was last adjusted
   * - user_adjustment_amount: User's adjustment for this category
   * - adjusted_by: Who made the user adjustment (user or admin)
   * - effective_price: base_price + user_adjustment_amount
   *
   * @param currentUserId - ID of requesting user
   * @param isAdmin - Whether requester is admin
   * @param userId - Target user (admin only)
   * @param category - Filter by category
   * @param city - Filter by city
   * @returns Array of price objects with all details
   */
  async getPrices({
    currentUserId,
    isAdmin,
    userId,
    category,
    city,
  }: {
    currentUserId: string;
    isAdmin: boolean;
    userId?: string;
    category?: string;
    city?: string;
  }) {
    // Admin can view any user's prices, regular user sees only their own
    const targetUserId = isAdmin && userId ? userId : currentUserId;

    this.logger.log(
      `Getting prices for user ${targetUserId}, category: ${category || 'all'}, city: ${city || 'all'}`,
    );

    const priceQuery = this.buildCityPriceQuery({ city, category });

    const [cityPrices, userAdjustments] = await Promise.all([
      this.cityPriceModel.find(priceQuery).lean().exec(),
      this.userCategoryAdjustmentModel
        .find({ user: targetUserId })
        .lean()
        .exec(),
    ]);

    const adjustmentMap = this.createAdjustmentMap(userAdjustments);

    return cityPrices.map((cp) =>
      this.calculateEffectivePrice({ cityPrice: cp, adjustmentMap }),
    );
  }

  async getPricesPaginated({
    currentUserId,
    isAdmin,
    userId,
    category,
    paginationQuery,
  }: {
    currentUserId: string;
    isAdmin: boolean;
    userId?: string;
    category?: string;
    paginationQuery: PaginationQueryDto;
  }) {
    const targetUserId = isAdmin && userId ? userId : currentUserId;
    const { page = 1, limit = 10, search } = paginationQuery;

    this.logger.log(
      `Getting paginated prices for user ${targetUserId}, category: ${category || 'all'}`,
    );

    const priceQuery = this.buildCityPriceQuery({ category, search });
    const skip = (page - 1) * limit;

    const [cityPrices, totalItems, userAdjustments] = await Promise.all([
      this.cityPriceModel
        .find(priceQuery)
        .skip(skip)
        .limit(limit)
        .sort({ city: 1 })
        .lean()
        .exec(),
      this.cityPriceModel.countDocuments(priceQuery).exec(),
      this.userCategoryAdjustmentModel
        .find({ user: targetUserId })
        .lean()
        .exec(),
    ]);

    const adjustmentMap = this.createAdjustmentMap(userAdjustments);

    const data = cityPrices.map((cp) =>
      this.calculateEffectivePrice({ cityPrice: cp, adjustmentMap }),
    );

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getEffectivePrice({
    currentUserId,
    isAdmin,
    userId,
    city,
    category,
  }: {
    currentUserId: string;
    isAdmin: boolean;
    userId?: string;
    city?: string;
    category?: string;
  }) {
    const targetUserId = isAdmin && userId ? userId : currentUserId;

    this.logger.log(
      `Getting effective price for user ${targetUserId}, city: ${city || 'any'}, category: ${category || 'any'}`,
    );

    // Build query - category and city optional
    const query: FilterQuery<CityPrice> = {};
    if (category) {
      query.category = category;
    }
    if (city) {
      query.city = new RegExp(`^${city}$`, 'i');
    }

    const cityPrice = await this.cityPriceModel.findOne(query).lean().exec();

    const userAdjustment = category
      ? await this.userCategoryAdjustmentModel
          .findOne({ user: targetUserId, category })
          .lean()
          .exec()
      : null;

    if (!cityPrice) {
      const filters = [
        city && `city "${city}"`,
        category && `category "${category}"`,
      ]
        .filter(Boolean)
        .join(' and ');
      throw new NotFoundException(
        `City price not found for ${filters || 'any category/city'}`,
      );
    }

    const userAdjustmentAmount = userAdjustment?.user_adjustment_amount || 0;
    const adminAdjustmentAmount = userAdjustment?.admin_adjustment_amount || 0;
    const totalAdjustment = userAdjustmentAmount + adminAdjustmentAmount;
    const effectivePrice = cityPrice.base_price + totalAdjustment;

    return {
      city: cityPrice.city,
      category: cityPrice.category,
      base_price: cityPrice.base_price,
      base_last_adjustment_amount: cityPrice.last_adjustment_amount,
      base_last_adjustment_date: cityPrice.last_adjustment_date,
      user_adjustment_amount: userAdjustmentAmount,
      admin_adjustment_amount: adminAdjustmentAmount,
      total_adjustment_amount: totalAdjustment,
      adjusted_by: userAdjustment?.adjusted_by ?? null,
      effective_price: effectivePrice,
    };
  }

  async getCitiesByCategory(category?: string) {
    this.logger.log(
      `Fetching cities by category (public), category: ${category || 'all'}`,
    );

    const matchStage = category ? { category } : {};

    return this.cityPriceModel.aggregate([
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: '$category',
          cities: { $addToSet: '$city' },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          cities: 1,
        },
      },
      {
        $sort: { category: 1 },
      },
    ]);
  }
}
