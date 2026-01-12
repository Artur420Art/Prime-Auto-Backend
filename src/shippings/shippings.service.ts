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
import { AdjustUserPricesDto } from './dto/update-price.dto';
import { AdjustBasePriceDto } from './dto/adjust-base-price.dto';
import { AdminAdjustUserPriceDto } from './dto/admin-adjust-user-price.dto';
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
  // CITY PRICE (Admin) - Base prices
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
  // ADMIN - Adjust base price (all users)
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

    return { modifiedCount: result.modifiedCount };
  }

  // ========================================
  // ADMIN - Adjust specific user's price
  // ========================================

  async adminAdjustUserPrice(adjustDto: AdminAdjustUserPriceDto) {
    const { userId, category, adjustment_amount } = adjustDto;
    this.logger.log(
      `Admin adjusting price for user ${userId}, category: ${category} by ${adjustment_amount}`,
    );

    // Get existing adjustment to track history
    const existingAdjustment = await this.userCategoryAdjustmentModel
      .findOne({ user: userId, category })
      .lean()
      .exec();

    const currentAdjustment = existingAdjustment?.adjustment_amount ?? 0;
    const isNewAdjustment = adjustment_amount !== currentAdjustment;

    const updateFields: Record<string, unknown> = {
      adjustment_amount,
      adjusted_by: AdjustedBy.ADMIN,
    };

    if (isNewAdjustment) {
      updateFields.last_adjustment_amount = currentAdjustment;
      updateFields.last_adjustment_date = new Date();
    }

    const result = await this.userCategoryAdjustmentModel
      .findOneAndUpdate(
        { user: userId, category },
        { $set: updateFields },
        { upsert: true, new: true },
      )
      .populate('user', 'firstName lastName email')
      .exec();

    return result;
  }

  // ========================================
  // USER - Adjust their own price
  // ========================================

  async adjustUserPrices({
    adjustDto,
    userId,
  }: {
    adjustDto: AdjustUserPricesDto;
    userId: string;
  }) {
    const { category, adjustment_amount } = adjustDto;
    this.logger.log(
      `User ${userId} adjusting prices for category ${category} by ${adjustment_amount}`,
    );

    // Get existing adjustment to track history
    const existingAdjustment = await this.userCategoryAdjustmentModel
      .findOne({ user: userId, category })
      .lean()
      .exec();

    const currentAdjustment = existingAdjustment?.adjustment_amount ?? 0;
    const isNewAdjustment = adjustment_amount !== currentAdjustment;

    const updateFields: Record<string, unknown> = {
      adjustment_amount,
      adjusted_by: AdjustedBy.USER,
    };

    if (isNewAdjustment) {
      updateFields.last_adjustment_amount = currentAdjustment;
      updateFields.last_adjustment_date = new Date();
    }

    const result = await this.userCategoryAdjustmentModel
      .findOneAndUpdate(
        { user: userId, category },
        { $set: updateFields },
        { upsert: true, new: true },
      )
      .exec();

    return result;
  }

  // ========================================
  // GET ADJUSTMENTS
  // ========================================

  async getUserAdjustment({
    userId,
    category,
  }: {
    userId: string;
    category?: string;
  }) {
    this.logger.log(
      `Getting adjustment for user ${userId}, category: ${category || 'any'}`,
    );

    const query: FilterQuery<UserCategoryAdjustment> = { user: userId };
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

  async getAllUserAdjustments(userId: string) {
    this.logger.log(`Getting all adjustments for user ${userId}`);
    return this.userCategoryAdjustmentModel
      .find({ user: userId })
      .lean()
      .exec();
  }

  // Admin: Get all adjustments for a specific user
  async getAdjustmentsByUserId(userId: string) {
    this.logger.log(`Admin getting adjustments for user ${userId}`);
    return this.userCategoryAdjustmentModel
      .find({ user: userId })
      .populate('user', 'firstName lastName email')
      .lean()
      .exec();
  }

  // Admin: Get all user adjustments (all users)
  async getAllAdjustments(category?: string) {
    this.logger.log(`Admin getting all user adjustments`);
    const query: FilterQuery<UserCategoryAdjustment> = {};
    if (category) {
      query.category = category;
    }
    return this.userCategoryAdjustmentModel
      .find(query)
      .populate('user', 'firstName lastName email')
      .lean()
      .exec();
  }

  // ========================================
  // USER PRICES (calculated)
  // ========================================

  async getUserPrices({
    userId,
    category,
    city,
  }: {
    userId: string;
    category?: string;
    city?: string;
  }) {
    this.logger.log(
      `Getting user prices for user ${userId}, category: ${category || 'all'}, city: ${city || 'all'}`,
    );

    const priceQuery: FilterQuery<CityPrice> = {};
    if (category) priceQuery.category = category;
    if (city) priceQuery.city = new RegExp(`^${city}$`, 'i');

    const [cityPrices, userAdjustments] = await Promise.all([
      this.cityPriceModel.find(priceQuery).lean().exec(),
      this.userCategoryAdjustmentModel.find({ user: userId }).lean().exec(),
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

  async getUserPricesPaginated({
    userId,
    category,
    paginationQuery,
  }: {
    userId: string;
    category?: string;
    paginationQuery: PaginationQueryDto;
  }) {
    const { page = 1, limit = 10, search } = paginationQuery;
    this.logger.log(
      `Getting paginated user prices for user ${userId}, category: ${category || 'all'}`,
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
      this.userCategoryAdjustmentModel.find({ user: userId }).lean().exec(),
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

  async getEffectivePrice(userId: string, city: string, category: string) {
    this.logger.log(
      `Getting effective price for user ${userId}, city: ${city}, category: ${category}`,
    );

    const cityPrice = await this.cityPriceModel
      .findOne({ city: new RegExp(`^${city}$`, 'i'), category })
      .lean()
      .exec();

    const userAdjustment = await this.userCategoryAdjustmentModel
      .findOne({ user: userId, category })
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
