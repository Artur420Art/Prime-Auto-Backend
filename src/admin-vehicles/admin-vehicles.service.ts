import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';

import { CreateAdminVehicleDto } from './dto/create-admin-vehicle.dto';
import { FindAdminVehiclesQueryDto } from './dto/find-admin-vehicles.query';
import { UpdateAdminVehicleDto } from './dto/update-admin-vehicle.dto';
import { AdminVehicle } from './schemas/admin-vehicle.schema';

@Injectable()
export class AdminVehiclesService {
  constructor(
    @InjectModel(AdminVehicle.name)
    private readonly adminVehicleModel: Model<AdminVehicle>,
  ) {}

  private buildFindFilter = (query: FindAdminVehiclesQueryDto) => {
    const filter: Record<string, unknown> = {};

    if (query.type) {
      filter.type = query.type;
    }

    if (query.mark) {
      filter.brand = { $regex: query.mark, $options: 'i' };
    }

    return filter;
  };

  create = async (dto: CreateAdminVehicleDto): Promise<AdminVehicle> => {
    const created = new this.adminVehicleModel(dto);
    return created.save();
  };

  findAll = async (
    query: FindAdminVehiclesQueryDto,
  ): Promise<AdminVehicle[]> => {
    const filter = this.buildFindFilter(query);
    return this.adminVehicleModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  };

  findOne = async (id: string): Promise<AdminVehicle> => {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid id');
    }

    const doc = await this.adminVehicleModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException(`AdminVehicle with ID "${id}" not found`);
    }

    return doc;
  };

  update = async (
    id: string,
    dto: UpdateAdminVehicleDto,
  ): Promise<AdminVehicle> => {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid id');
    }

    const updated = await this.adminVehicleModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`AdminVehicle with ID "${id}" not found`);
    }

    return updated;
  };

  remove = async (id: string): Promise<void> => {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid id');
    }

    const deleted = await this.adminVehicleModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`AdminVehicle with ID "${id}" not found`);
    }
  };
}
