import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Vehicle } from './schemas/vehicle.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleType } from './enums/vehicle-type.enum';
import { UsersService } from '../users/users.service';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
    private readonly usersService: UsersService,
  ) {}

  private async resolveUserObjectId(idOrCustomerId: string): Promise<Types.ObjectId> {
    if (isValidObjectId(idOrCustomerId)) {
      return new Types.ObjectId(idOrCustomerId);
    }

    const user = await this.usersService.findByCustomerId(idOrCustomerId);
    if (!user) {
      this.logger.warn(`User with ID or Customer ID "${idOrCustomerId}" not found`);
      throw new NotFoundException(`User with ID or Customer ID "${idOrCustomerId}" not found`);
    }
    return user._id as Types.ObjectId;
  }

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    this.logger.log(`Creating vehicle: ${createVehicleDto.vin}`);
    
    const clientObjectId = await this.resolveUserObjectId(createVehicleDto.client);
    
    const createdVehicle = new this.vehicleModel({
      ...createVehicleDto,
      client: clientObjectId,
    });
    return createdVehicle.save();
  }

  async findAll(user: { userId: string; roles: string[] }): Promise<Vehicle[]> {
    this.logger.log(`Fetching vehicles for user: ${user.userId}, roles: ${user.roles}`);
    
    const query: any = {};
    
    if (!user.roles.includes('admin')) {
      query.client = new Types.ObjectId(user.userId);
    }

    return this.vehicleModel
      .find(query)
      .populate('client', 'firstName lastName email customerId')
      .exec();
  }

  async findOne(id: string): Promise<Vehicle> {
    this.logger.log(`Fetching vehicle with ID: ${id}`);
    const vehicle = await this.vehicleModel
      .findById(id)
      .populate('client', 'firstName lastName email customerId, companyName')
      .exec();
    if (!vehicle) {
      this.logger.warn(`Vehicle with ID "${id}" not found`);
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }
    return vehicle;
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<Vehicle> {
    this.logger.log(`Updating vehicle with ID: ${id}`);
    
    const updateData: any = { ...updateVehicleDto };
    if (updateVehicleDto.client) {
      updateData.client = await this.resolveUserObjectId(updateVehicleDto.client);
    }

    const updatedVehicle = await this.vehicleModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!updatedVehicle) {
      this.logger.warn(`Vehicle with ID "${id}" not found for update`);
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }
    return updatedVehicle;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing vehicle with ID: ${id}`);
    const result = await this.vehicleModel.findByIdAndDelete(id).exec();
    if (!result) {
      this.logger.warn(`Vehicle with ID "${id}" not found for removal`);
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }
  }

}
