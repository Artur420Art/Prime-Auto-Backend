import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shipping } from './schemas/shipping.schema';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';

@Injectable()
export class ShippingsService {
  private readonly logger = new Logger(ShippingsService.name);

  constructor(
    @InjectModel(Shipping.name) private shippingModel: Model<Shipping>,
  ) {}

  async create(createShippingDto: CreateShippingDto): Promise<Shipping> {
    this.logger.log(`Creating shipping for user ${createShippingDto.user}`);
    const createdShipping = new this.shippingModel(createShippingDto);
    return createdShipping.save();
  }

  async findAll(userId?: string): Promise<Shipping[]> {
    this.logger.log(`Fetching all shippings${userId ? ` for user ${userId}` : ''}`);
    const filter = userId ? { user: userId } : {};
    return this.shippingModel.find(filter).exec();
  }

  async findOne(id: string): Promise<Shipping> {
    this.logger.log(`Fetching shipping with ID ${id}`);
    const shipping = await this.shippingModel.findById(id).populate('user', 'email firstName lastName').exec();
    if (!shipping) {
      this.logger.warn(`Shipping with ID ${id} not found`);
      throw new NotFoundException(`Shipping with ID "${id}" not found`);
    }
    return shipping;
  }

  async update(id: string, updateShippingDto: UpdateShippingDto): Promise<Shipping> {
    this.logger.log(`Updating shipping with ID ${id}`);
    const updatedShipping = await this.shippingModel
      .findByIdAndUpdate(id, updateShippingDto, { new: true })
      .exec();
    if (!updatedShipping) {
      this.logger.warn(`Shipping with ID ${id} not found for update`);
      throw new NotFoundException(`Shipping with ID "${id}" not found`);
    }
    return updatedShipping;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing shipping with ID ${id}`);
    const result = await this.shippingModel.findByIdAndDelete(id).exec();
    if (!result) {
      this.logger.warn(`Shipping with ID ${id} not found for removal`);
      throw new NotFoundException(`Shipping with ID "${id}" not found`);
    }
  }

  async increaseAllPrices(amount: number, userId?: string): Promise<void> {
    this.logger.log(`Increasing all shipping prices by ${amount}${userId ? ` for user ${userId}` : ''}`);
    const filter = userId ? { user: userId } : {};
    await this.shippingModel.updateMany(filter, { $inc: { shipping: amount } }).exec();
  }
}
