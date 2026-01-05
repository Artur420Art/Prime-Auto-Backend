import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shipping } from './schemas/shipping.schema';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';

@Injectable()
export class ShippingsService {
  constructor(
    @InjectModel(Shipping.name) private shippingModel: Model<Shipping>,
  ) {}

  async create(createShippingDto: CreateShippingDto): Promise<Shipping> {
    const createdShipping = new this.shippingModel(createShippingDto);
    return createdShipping.save();
  }

  async findAll(userId?: string): Promise<Shipping[]> {
    const filter = userId ? { user: userId } : {};
    return this.shippingModel.find(filter).exec();
  }

  async findOne(id: string): Promise<Shipping> {
    const shipping = await this.shippingModel.findById(id).populate('user', 'email firstName lastName').exec();
    if (!shipping) {
      throw new NotFoundException(`Shipping with ID "${id}" not found`);
    }
    return shipping;
  }

  async update(id: string, updateShippingDto: UpdateShippingDto): Promise<Shipping> {
    const updatedShipping = await this.shippingModel
      .findByIdAndUpdate(id, updateShippingDto, { new: true })
      .exec();
    if (!updatedShipping) {
      throw new NotFoundException(`Shipping with ID "${id}" not found`);
    }
    return updatedShipping;
  }

  async remove(id: string): Promise<void> {
    const result = await this.shippingModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Shipping with ID "${id}" not found`);
    }
  }

  async increaseAllPrices(amount: number, userId?: string): Promise<void> {
    const filter = userId ? { user: userId } : {};
    await this.shippingModel.updateMany(filter, { $inc: { shipping: amount } }).exec();
  }
}
