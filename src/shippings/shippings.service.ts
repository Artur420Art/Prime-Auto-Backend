import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, AnyBulkWriteOperation } from 'mongoose';

import { UserShipping } from './schemas/shipping.schema';
import { CityPrice } from './schemas/city-price.schema';
import { CreateCityPriceDto } from './dto/create-shipping.dto';
import { UpdateCityPriceDto } from './dto/update-city-price.dto';
import { UpdateDefaultPriceDto } from './dto/update-default-price.dto';
import { BulkUpdateDefaultPriceDto } from './dto/bulk-update-default-price.dto';
import { AdjustUserPricesDto } from './dto/update-price.dto';
import {
  calculateCurrentPrice,
  determinePriceSource,
} from './utils/price-calculator.util';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/pagination-response.dto';

@Injectable()
export class ShippingsService {
  private readonly logger = new Logger(ShippingsService.name);

  constructor(
    @InjectModel(UserShipping.name)
    private userShippingModel: Model<UserShipping>,
    @InjectModel(CityPrice.name)
    private cityPriceModel: Model<CityPrice>,
  ) {}

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

  async getAllCityPrices(): Promise<CityPrice[]> {
    this.logger.log('Fetching all city prices');
    return this.cityPriceModel.find().exec();
  }

  async getAllCityPricesPaginated(
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<CityPrice>> {
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
  }): Promise<CityPrice[]> {
    this.logger.log(
      `Fetching city prices with filters: city=${city}, category=${category}`,
    );
    const query: FilterQuery<CityPrice> = {};
    if (city) query.city = new RegExp(`^${city}$`, 'i');
    if (category) query.category = category;
    return this.cityPriceModel.find(query).exec();
  }

  async findAllUserShippings(user: {
    userId: string;
    roles: string[];
  }): Promise<UserShipping[]> {
    this.logger.log(
      `Fetching user shippings for user: ${user.userId}, roles: ${user.roles}`,
    );

    const query: FilterQuery<UserShipping> = {};

    if (!user.roles.includes('admin')) {
      query.user = user.userId;
      await this.ensureUserShippingsExist(user.userId);
    }

    return this.userShippingModel
      .find(query)
      .populate('user', 'firstName lastName email customerId')
      .exec();
  }

  async findAllUserShippingsPaginated({
    user,
    paginationQuery,
  }: {
    user: { userId: string; roles: string[] };
    paginationQuery: PaginationQueryDto;
  }): Promise<PaginatedResponseDto<UserShipping>> {
    const { page = 1, limit = 10, search } = paginationQuery;
    this.logger.log(
      `Fetching user shippings with pagination - page: ${page}, limit: ${limit}, user: ${user.userId}`,
    );

    const query: FilterQuery<UserShipping> = {};

    if (!user.roles.includes('admin')) {
      query.user = user.userId;
      await this.ensureUserShippingsExist(user.userId);
    }

    if (search) {
      query.$or = [
        { city: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      this.userShippingModel
        .find(query)
        .populate('user', 'firstName lastName email customerId')
        .skip(skip)
        .limit(limit)
        .sort({ city: 1 })
        .exec(),
      this.userShippingModel.countDocuments(query).exec(),
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

  private async ensureUserShippingsExist(userId: string): Promise<void> {
    const existingCount = await this.userShippingModel
      .countDocuments({ user: userId })
      .exec();

    if (existingCount === 0) {
      this.logger.log(
        `Initializing user shippings with base prices for user ${userId}`,
      );

      const cityPrices = await this.cityPriceModel.find().exec();

      if (cityPrices.length > 0) {
        const userShippings = cityPrices.map((cp) => ({
          user: userId,
          city: cp.city,
          category: cp.category,
          default_price: cp.base_price,
          price_adjustment: 0,
          last_adjustment_amount: null,
          last_adjustment_date: null,
          current_price: cp.base_price,
        }));

        await this.userShippingModel.insertMany(userShippings);
      }
    }
  }

  async findUserShippingsByCity(
    city: string,
    user: { userId: string; roles: string[] },
  ): Promise<UserShipping[]> {
    this.logger.log(
      `Fetching user shippings for city: ${city}, user: ${user.userId}, roles: ${user.roles}`,
    );

    const query: FilterQuery<UserShipping> = {
      city: new RegExp(`^${city}$`, 'i'),
    };

    if (!user.roles.includes('admin')) {
      query.user = user.userId;
    }

    return this.userShippingModel
      .find(query)
      .populate('user', 'firstName lastName email customerId')
      .exec();
  }

  async findUserShippingsByCityAndCategory(
    city: string,
    category: string,
    user: { userId: string; roles: string[] },
  ): Promise<UserShipping[]> {
    this.logger.log(
      `Fetching user shippings for city: ${city}, category: ${category}, user: ${user.userId}, roles: ${user.roles}`,
    );

    const query: FilterQuery<UserShipping> = {
      city: new RegExp(`^${city}$`, 'i'),
      category,
    };

    if (!user.roles.includes('admin')) {
      query.user = user.userId;
    }

    return this.userShippingModel
      .find(query)
      .populate('user', 'firstName lastName email customerId')
      .exec();
  }

  async findOneUserShipping(id: string): Promise<UserShipping> {
    this.logger.log(`Fetching user shipping with ID ${id}`);
    const shipping = await this.userShippingModel
      .findById(id)
      .populate('user', 'email firstName lastName')
      .exec();
    if (!shipping) {
      this.logger.warn(`User shipping with ID ${id} not found`);
      throw new NotFoundException(`User shipping with ID "${id}" not found`);
    }
    return shipping;
  }

  async removeUserShipping(id: string): Promise<void> {
    this.logger.log(`Removing user shipping with ID ${id}`);
    const result = await this.userShippingModel.findByIdAndDelete(id).exec();
    if (!result) {
      this.logger.warn(`User shipping with ID ${id} not found for removal`);
      throw new NotFoundException(`User shipping with ID "${id}" not found`);
    }
  }

  async updateCityPrice({
    city,
    category,
    updateDto,
  }: {
    city: string;
    category: string;
    updateDto: UpdateCityPriceDto;
  }): Promise<CityPrice> {
    this.logger.log(
      `Updating city price for city: ${city}, category: ${category}`,
    );
    const cityPrice = await this.cityPriceModel
      .findOneAndUpdate({ city, category }, updateDto, { new: true })
      .exec();
    if (!cityPrice) {
      this.logger.warn(
        `City price not found for city: ${city}, category: ${category}`,
      );
      throw new NotFoundException(
        `City price not found for city "${city}" and category "${category}"`,
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

  async updateDefaultPrice(
    updateDto: UpdateDefaultPriceDto,
  ): Promise<UserShipping> {
    this.logger.log(
      `Admin updating default_price for user ${updateDto.userId}, city ${updateDto.city}, category ${updateDto.category}`,
    );

    const cityPrice = await this.cityPriceModel
      .findOne({ city: updateDto.city, category: updateDto.category })
      .exec();

    if (!cityPrice) {
      throw new NotFoundException(
        `Base city price not found for city ${updateDto.city} and category ${updateDto.category}`,
      );
    }

    const existingShipping = await this.userShippingModel
      .findOne({
        user: updateDto.userId,
        city: updateDto.city,
        category: updateDto.category,
      })
      .exec();

    const priceAdjustment = existingShipping?.price_adjustment || 0;
    const currentPrice = calculateCurrentPrice({
      defaultPrice: updateDto.default_price,
      adjustment: priceAdjustment,
    });

    const shipping = await this.userShippingModel
      .findOneAndUpdate(
        {
          user: updateDto.userId,
          city: updateDto.city,
          category: updateDto.category,
        },
        {
          default_price: updateDto.default_price,
          current_price: currentPrice,
          price_adjustment: priceAdjustment,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    return shipping;
  }

  async bulkUpdateDefaultPrice({
    updateDto,
    userId,
  }: {
    updateDto: BulkUpdateDefaultPriceDto;
    userId?: string;
  }): Promise<{ modifiedCount: number }> {
    this.logger.log(
      `Admin bulk updating default_price: city=${updateDto.city}, category=${updateDto.category}, userId=${userId}`,
    );

    const cityPriceQuery: FilterQuery<CityPrice> = {};
    if (updateDto.city) cityPriceQuery.city = updateDto.city;
    if (updateDto.category) cityPriceQuery.category = updateDto.category;

    const cityPrices = await this.cityPriceModel.find(cityPriceQuery).exec();

    if (cityPrices.length === 0) {
      throw new NotFoundException(
        'No matching city prices found for the given filters',
      );
    }

    const userShippingQuery: FilterQuery<UserShipping> = {};
    if (userId) userShippingQuery.user = userId;
    if (updateDto.city) userShippingQuery.city = updateDto.city;
    if (updateDto.category) userShippingQuery.category = updateDto.category;

    const existingShippings = await this.userShippingModel
      .find(userShippingQuery)
      .exec();

    const updates: AnyBulkWriteOperation<UserShipping>[] = [];
    for (const cityPrice of cityPrices) {
      const filter: FilterQuery<UserShipping> = {
        city: cityPrice.city,
        category: cityPrice.category,
      };
      if (userId) filter.user = userId;

      const existing = existingShippings.find(
        (s) =>
          s.city === cityPrice.city &&
          s.category === cityPrice.category &&
          (!userId || s.user.toString() === userId),
      );

      const priceAdjustment = existing?.price_adjustment || 0;
      const currentPrice = calculateCurrentPrice({
        defaultPrice: updateDto.default_price,
        adjustment: priceAdjustment,
      });

      updates.push({
        updateMany: {
          filter,
          update: {
            $set: {
              default_price: updateDto.default_price,
              current_price: currentPrice,
            },
            $setOnInsert: {
              city: cityPrice.city,
              category: cityPrice.category,
              price_adjustment: 0,
            },
          },
          upsert: true,
        },
      });
    }

    if (updates.length > 0) {
      const result = await this.userShippingModel.bulkWrite(updates);
      return { modifiedCount: result.modifiedCount + result.upsertedCount };
    }

    return { modifiedCount: 0 };
  }

  async adjustUserPrices({
    adjustDto,
    userId,
  }: {
    adjustDto: AdjustUserPricesDto;
    userId: string;
  }): Promise<{ modifiedCount: number }> {
    this.logger.log(
      `User ${userId} adjusting all prices by ${adjustDto.adjustment_amount}`,
    );

    const cityPrices = await this.cityPriceModel.find().exec();

    if (cityPrices.length === 0) {
      throw new NotFoundException('No city prices found in the system');
    }

    const updates: AnyBulkWriteOperation<UserShipping>[] = [];
    for (const cityPrice of cityPrices) {
      const existingUserShipping = await this.userShippingModel
        .findOne({
          user: userId,
          city: cityPrice.city,
          category: cityPrice.category,
        })
        .exec();

      const defaultPrice =
        existingUserShipping?.default_price ?? cityPrice.base_price;
      const oldAdjustment = existingUserShipping?.price_adjustment || 0;
      const newAdjustment = adjustDto.adjustment_amount;
      const currentPrice = calculateCurrentPrice({
        defaultPrice,
        adjustment: newAdjustment,
      });

      updates.push({
        updateOne: {
          filter: {
            user: userId as any,
            city: cityPrice.city,
            category: cityPrice.category,
          },
          update: {
            $set: {
              price_adjustment: newAdjustment,
              current_price: currentPrice,
              last_adjustment_amount: oldAdjustment,
              last_adjustment_date: new Date(),
            },
            $setOnInsert: {
              user: userId as any,
              city: cityPrice.city,
              category: cityPrice.category,
              default_price: cityPrice.base_price,
            },
          },
          upsert: true,
        },
      });
    }

    if (updates.length > 0) {
      const result = await this.userShippingModel.bulkWrite(updates);
      return { modifiedCount: result.modifiedCount + result.upsertedCount };
    }

    return { modifiedCount: 0 };
  }

  async getEffectivePrice(
    userId: string,
    city: string,
    category: string,
  ): Promise<{
    base_price: number;
    default_price: number;
    price_adjustment: number;
    last_adjustment_amount: number;
    last_adjustment_date: Date;
    current_price: number;
    source: string;
  }> {
    const cityPrice = await this.cityPriceModel
      .findOne({ city, category })
      .exec();

    if (!cityPrice) {
      throw new NotFoundException(
        `Base city price not found for city ${city} and category ${category}`,
      );
    }

    let userShipping = await this.userShippingModel
      .findOne({ user: userId, city, category })
      .exec();

    if (!userShipping) {
      userShipping = await this.userShippingModel.create({
        user: userId,
        city,
        category,
        default_price: cityPrice.base_price,
        price_adjustment: 0,
        last_adjustment_amount: null,
        last_adjustment_date: null,
        current_price: cityPrice.base_price,
      });
    }

    const basePrice = cityPrice.base_price;
    const defaultPrice = userShipping.default_price;
    const priceAdjustment = userShipping.price_adjustment;
    const lastAdjustmentAmount = userShipping.last_adjustment_amount;
    const lastAdjustmentDate = userShipping.last_adjustment_date;
    const currentPrice = userShipping.current_price;

    const source = determinePriceSource({
      basePrice,
      defaultPrice,
      priceAdjustment,
    });

    return {
      base_price: basePrice,
      default_price: defaultPrice,
      price_adjustment: priceAdjustment,
      last_adjustment_amount: lastAdjustmentAmount,
      last_adjustment_date: lastAdjustmentDate,
      current_price: currentPrice,
      source,
    };
  }
}
