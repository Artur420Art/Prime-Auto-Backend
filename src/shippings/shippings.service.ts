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

  async create(createShippingDto: CreateShippingDto, userId: string): Promise<Shipping> {
    this.logger.log(`Creating shipping for user ${userId}`);
    const createdShipping = new this.shippingModel({
      ...createShippingDto,
      user: userId,
    });
    return createdShipping.save();
  }

  async findAll(user: { userId: string; roles: string[] }): Promise<Shipping[]> {
    this.logger.log(`Fetching shippings for user: ${user.userId}, roles: ${user.roles}`);
    
    const query: any = {};
    
    if (!user.roles.includes('admin')) {
      query.user = user.userId;
    }

    return this.shippingModel.find(query).populate('user', 'firstName lastName email customerId').exec();
  }

  async findByCity(city: string, user: { userId: string; roles: string[] }): Promise<Shipping[]> {
    this.logger.log(`Fetching shippings for city: ${city}, user: ${user.userId}, roles: ${user.roles}`);
    
    const query: any = { city: new RegExp(`^${city}$`, 'i') };
    
    if (!user.roles.includes('admin')) {
      query.user = user.userId;
    }

    return this.shippingModel.find(query).populate('user', 'firstName lastName email customerId').exec();
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

  async increaseAllPrices(amount: number, user: { userId: string; roles: string[] }): Promise<void> {
    this.logger.log(`Increasing shippings prices by ${amount} for user: ${user.userId}, roles: ${user.roles}`);
    
    const query: any = {};
    
    if (!user.roles.includes('admin')) {
      query.user = user.userId;
    }

    await this.shippingModel.updateMany(query, { $inc: { shipping: amount } }).exec();
  }
}
