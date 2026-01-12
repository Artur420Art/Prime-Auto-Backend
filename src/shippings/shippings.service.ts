import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';

import { CityPrice } from './schemas/city-price.schema';
import { UserCategoryAdjustment } from './schemas/user-category-adjustment.schema';
import { CreateCityPriceDto } from './dto/create-shipping.dto';
import { UpdateCityPriceDto } from './dto/update-city-price.dto';
import { AdjustUserPricesDto } from './dto/update-price.dto';
import { AdjustBasePriceDto } from './dto/adjust-base-price.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/pagination-response.dto';

@Injectable()
export class ShippingsService {
  private readonly logger = new Logger(ShippingsService.name);

  constructor(
    @InjectModel(CityPrice.name)
    private cityPriceModel: Model<CityPrice>,
    @InjectModel(UserCategoryAdjustment.name)
    private userCategoryAdjustmentModel: Model<UserCategoryAdjustment>,
  ) {}

  // ============================================
  // CITY PRICE (Admin) - Base prices management
  // ============================================

  async createCityPrice(
    createCityPriceDto: CreateCityPriceDto,
  ): Promise<CityPrice> {
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
  }): Promise<CityPrice> {
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
      this.logger.warn(
        `City price not found for ${filters || 'given filters'}`,
      );
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
      this.logger.warn(`City price with ID ${id} not found for removal`);
      throw new NotFoundException(`City price with ID "${id}" not found`);
    }
  }

  async adjustBasePrice(
    adjustDto: AdjustBasePriceDto,
  ): Promise<{ modifiedCount: number }> {
    const { category, city, adjustment_amount } = adjustDto;
    this.logger.log(
      `Admin adjusting base price by ${adjustment_amount} for category: ${category}, city: ${city || 'all cities'}`,
    );

    const query: FilterQuery<CityPrice> = { category };
    if (city) {
      query.city = new RegExp(`^${city}$`, 'i');
    }

    const result = await this.cityPriceModel
      .updateMany(query, { $inc: { base_price: adjustment_amount } })
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

  // ============================================
  // USER ADJUSTMENTS - Per category adjustments
  // ============================================

  async adjustUserPrices({
    adjustDto,
    userId,
  }: {
    adjustDto: AdjustUserPricesDto;
    userId: string;
  }): Promise<UserCategoryAdjustment> {
    const { category, adjustment_amount } = adjustDto;
    this.logger.log(
      `User ${userId} adjusting prices for category ${category} by ${adjustment_amount}`,
    );

    // Get existing category adjustment to track history
    const existingAdjustment = await this.userCategoryAdjustmentModel
      .findOne({ user: userId, category })
      .lean()
      .exec();

    const currentAdjustment = existingAdjustment?.adjustment_amount ?? 0;
    const isNewAdjustment = adjustment_amount !== currentAdjustment;

    // Build update object - only update last_adjustment if value actually changed
    const updateFields: Record<string, unknown> = {
      adjustment_amount,
    };

    if (isNewAdjustment) {
      updateFields.last_adjustment_amount = currentAdjustment;
      updateFields.last_adjustment_date = new Date();
    }

    // Store/update category adjustment
    const result = await this.userCategoryAdjustmentModel
      .findOneAndUpdate(
        { user: userId, category },
        { $set: updateFields },
        { upsert: true, new: true },
      )
      .exec();

    return result;
  }

  async getUserAdjustmentAmount({
    userId,
    category,
  }: {
    userId: string;
    category?: string;
  }): Promise<{
    adjustment_amount: number;
    last_adjustment_amount: number | null;
    last_adjustment_date: Date | null;
  }> {
    this.logger.log(
      `Getting adjustment amount for user ${userId}, category: ${category || 'any'}`,
    );

    const query: FilterQuery<UserCategoryAdjustment> = { user: userId };
    if (category) {
      query.category = category;
    }

    const categoryAdjustment = await this.userCategoryAdjustmentModel
      .findOne(query)
      .lean()
      .exec();

    if (!categoryAdjustment) {
      return {
        adjustment_amount: 0,
        last_adjustment_amount: null,
        last_adjustment_date: null,
      };
    }

    return {
      adjustment_amount: categoryAdjustment.adjustment_amount || 0,
      last_adjustment_amount: categoryAdjustment.last_adjustment_amount,
      last_adjustment_date: categoryAdjustment.last_adjustment_date,
    };
  }

  async getAllUserAdjustments(userId: string) {
    this.logger.log(`Getting all adjustments for user ${userId}`);
    return this.userCategoryAdjustmentModel
      .find({ user: userId })
      .lean()
      .exec();
  }

  // ============================================
  // USER PRICES - Calculate effective prices
  // ============================================

  async getUserPrices({
    userId,
    category,
    city,
  }: {
    userId: string;
    category?: string;
    city?: string;
  }): Promise<
    Array<{
      city: string;
      category: string;
      base_price: number;
      adjustment_amount: number;
      effective_price: number;
    }>
  > {
    this.logger.log(
      `Getting user prices for user ${userId}, category: ${category || 'all'}, city: ${city || 'all'}`,
    );

    // Get base prices
    const priceQuery: FilterQuery<CityPrice> = {};
    if (category) priceQuery.category = category;
    if (city) priceQuery.city = new RegExp(`^${city}$`, 'i');

    const [cityPrices, userAdjustments] = await Promise.all([
      this.cityPriceModel.find(priceQuery).lean().exec(),
      this.userCategoryAdjustmentModel.find({ user: userId }).lean().exec(),
    ]);

    // Create adjustment map for O(1) lookup
    const adjustmentMap = new Map(
      userAdjustments.map((adj) => [adj.category, adj.adjustment_amount || 0]),
    );

    // Calculate effective prices
    return cityPrices.map((cp) => {
      const adjustment = adjustmentMap.get(cp.category) || 0;
      return {
        city: cp.city,
        category: cp.category,
        base_price: cp.base_price,
        adjustment_amount: adjustment,
        effective_price: cp.base_price + adjustment,
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
  }): Promise<
    PaginatedResponseDto<{
      city: string;
      category: string;
      base_price: number;
      adjustment_amount: number;
      effective_price: number;
    }>
  > {
    const { page = 1, limit = 10, search } = paginationQuery;
    this.logger.log(
      `Getting paginated user prices for user ${userId}, category: ${category || 'all'}`,
    );

    // Build query
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

    // Create adjustment map
    const adjustmentMap = new Map(
      userAdjustments.map((adj) => [adj.category, adj.adjustment_amount || 0]),
    );

    // Calculate effective prices
    const data = cityPrices.map((cp) => {
      const adjustment = adjustmentMap.get(cp.category) || 0;
      return {
        city: cp.city,
        category: cp.category,
        base_price: cp.base_price,
        adjustment_amount: adjustment,
        effective_price: cp.base_price + adjustment,
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

  async getEffectivePrice(
    userId: string,
    city: string,
    category: string,
  ): Promise<{
    base_price: number;
    adjustment_amount: number;
    effective_price: number;
    last_adjustment_amount: number | null;
    last_adjustment_date: Date | null;
  }> {
    this.logger.log(
      `Getting effective price for user ${userId}, city: ${city}, category: ${category}`,
    );

    const [cityPrice, userAdjustment] = await Promise.all([
      this.cityPriceModel.findOne({ city, category }).lean().exec(),
      this.userCategoryAdjustmentModel
        .findOne({ user: userId, category })
        .lean()
        .exec(),
    ]);

    if (!cityPrice) {
      throw new NotFoundException(
        `City price not found for city "${city}" and category "${category}"`,
      );
    }

    const adjustmentAmount = userAdjustment?.adjustment_amount || 0;
    const effectivePrice = cityPrice.base_price + adjustmentAmount;

    return {
      base_price: cityPrice.base_price,
      adjustment_amount: adjustmentAmount,
      effective_price: effectivePrice,
      last_adjustment_amount: userAdjustment?.last_adjustment_amount ?? null,
      last_adjustment_date: userAdjustment?.last_adjustment_date ?? null,
    };
  }
}
