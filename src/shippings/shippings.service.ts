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

    const query: FilterQuery<CityPrice> = {};
    if (search) {
      query.$or = [
        { city: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

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
    const query: FilterQuery<CityPrice> = {};
    if (city) query.city = new RegExp(`^${city}$`, 'i');
    if (category) query.category = category;
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

    const query: FilterQuery<CityPrice> = {};
    if (city) query.city = new RegExp(`^${city}$`, 'i');
    if (category) query.category = category;

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

  // ========================================
  // Adjust Base Price (Admin only)
  // ========================================

  async adjustBasePrice(adjustDto: AdjustBasePriceDto) {
    const { category, city, adjustment_amount } = adjustDto;
    this.logger.log(
      `Admin adjusting base price by ${adjustment_amount} for category: ${category}, city: ${city || 'all cities'}`,
    );

    const query: FilterQuery<CityPrice> = { category };
    if (city) {
      query.city = new RegExp(`^${city}$`, 'i');
    }

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
      adjustment_amount,
      category,
      city: city || 'all',
      adjusted_at: new Date(),
    };
  }

  async getBaseAdjustmentInfo({ category }: { category?: string }) {
    this.logger.log(
      `Getting base adjustment info for category: ${category || 'all'}`,
    );

    const query: FilterQuery<CityPrice> = {};
    if (category) {
      query.category = category;
    }

    // Get the most recent adjustment info (all cities in category have same adjustment)
    const cityPrice = await this.cityPriceModel
      .findOne(query)
      .sort({ last_adjustment_date: -1 })
      .lean()
      .exec();

    if (!cityPrice) {
      return {
        last_adjustment_amount: null,
        last_adjustment_date: null,
        category: category || 'all',
      };
    }

    return {
      last_adjustment_amount: cityPrice.last_adjustment_amount,
      last_adjustment_date: cityPrice.last_adjustment_date,
      category: cityPrice.category,
    };
  }

  // ========================================
  // Adjust User Price (Role-aware)
  // ========================================

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
      `${adjustedBy} adjusting price for user ${targetUserId}, category: ${category} by ${adjustment_amount}`,
    );

    // Get existing adjustment to track history
    const existingAdjustment = await this.userCategoryAdjustmentModel
      .findOne({ user: targetUserId, category })
      .lean()
      .exec();

    const currentAdjustment = existingAdjustment?.adjustment_amount ?? 0;
    const isNewAdjustment = adjustment_amount !== currentAdjustment;

    const updateFields: Record<string, unknown> = {
      adjustment_amount,
      adjusted_by: adjustedBy,
    };

    if (isNewAdjustment) {
      updateFields.last_adjustment_amount = currentAdjustment;
      updateFields.last_adjustment_date = new Date();
    }

    const result = await this.userCategoryAdjustmentModel
      .findOneAndUpdate(
        { user: targetUserId, category },
        { $set: updateFields },
        { upsert: true, new: true },
      )
      .populate('user', 'firstName lastName email')
      .exec();

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
        adjustment_amount: 0,
        adjusted_by: null,
        last_adjustment_amount: null,
        last_adjustment_date: null,
      };
    }

    return {
      adjustment_amount: adjustment.adjustment_amount || 0,
      adjusted_by: adjustment.adjusted_by,
      last_adjustment_amount: adjustment.last_adjustment_amount,
      last_adjustment_date: adjustment.last_adjustment_date,
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

    const priceQuery: FilterQuery<CityPrice> = {};
    if (category) priceQuery.category = category;
    if (city) priceQuery.city = new RegExp(`^${city}$`, 'i');

    const [cityPrices, userAdjustments] = await Promise.all([
      this.cityPriceModel.find(priceQuery).lean().exec(),
      this.userCategoryAdjustmentModel
        .find({ user: targetUserId })
        .lean()
        .exec(),
    ]);

    // Create adjustment map for O(1) lookup
    const adjustmentMap = new Map(
      userAdjustments.map((adj) => [
        adj.category,
        {
          adjustment_amount: adj.adjustment_amount || 0,
          adjusted_by: adj.adjusted_by,
        },
      ]),
    );

    return cityPrices.map((cp) => {
      const userAdj = adjustmentMap.get(cp.category) || {
        adjustment_amount: 0,
        adjusted_by: null,
      };
      return {
        city: cp.city,
        category: cp.category,
        base_price: cp.base_price,
        base_last_adjustment_amount: cp.last_adjustment_amount,
        base_last_adjustment_date: cp.last_adjustment_date,
        user_adjustment_amount: userAdj.adjustment_amount,
        adjusted_by: userAdj.adjusted_by,
        effective_price: cp.base_price + userAdj.adjustment_amount,
      };
    });
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

    const priceQuery: FilterQuery<CityPrice> = {};
    if (category) priceQuery.category = category;
    if (search) {
      priceQuery.$or = [
        { city: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

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

    const adjustmentMap = new Map(
      userAdjustments.map((adj) => [
        adj.category,
        {
          adjustment_amount: adj.adjustment_amount || 0,
          adjusted_by: adj.adjusted_by,
        },
      ]),
    );

    const data = cityPrices.map((cp) => {
      const userAdj = adjustmentMap.get(cp.category) || {
        adjustment_amount: 0,
        adjusted_by: null,
      };
      return {
        city: cp.city,
        category: cp.category,
        base_price: cp.base_price,
        base_last_adjustment_amount: cp.last_adjustment_amount,
        base_last_adjustment_date: cp.last_adjustment_date,
        user_adjustment_amount: userAdj.adjustment_amount,
        adjusted_by: userAdj.adjusted_by,
        effective_price: cp.base_price + userAdj.adjustment_amount,
      };
    });

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
    city: string;
    category: string;
  }) {
    const targetUserId = isAdmin && userId ? userId : currentUserId;

    this.logger.log(
      `Getting effective price for user ${targetUserId}, city: ${city}, category: ${category}`,
    );

    const cityPrice = await this.cityPriceModel
      .findOne({ city: new RegExp(`^${city}$`, 'i'), category })
      .lean()
      .exec();

    const userAdjustment = await this.userCategoryAdjustmentModel
      .findOne({ user: targetUserId, category })
      .lean()
      .exec();

    if (!cityPrice) {
      throw new NotFoundException(
        `City price not found for city "${city}" and category "${category}"`,
      );
    }

    const adjustmentAmount = userAdjustment?.adjustment_amount || 0;
    const effectivePrice = cityPrice.base_price + adjustmentAmount;

    return {
      base_price: cityPrice.base_price,
      base_last_adjustment_amount: cityPrice.last_adjustment_amount,
      base_last_adjustment_date: cityPrice.last_adjustment_date,
      user_adjustment_amount: adjustmentAmount,
      adjusted_by: userAdjustment?.adjusted_by ?? null,
      user_last_adjustment_amount:
        userAdjustment?.last_adjustment_amount ?? null,
      user_last_adjustment_date: userAdjustment?.last_adjustment_date ?? null,
      effective_price: effectivePrice,
    };
  }
}
