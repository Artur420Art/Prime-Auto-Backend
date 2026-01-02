import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle } from './schemas/vehicle.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleType } from './enums/vehicle-type.enum';
import { UsersService } from '../users/users.service';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
    private readonly usersService: UsersService,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    const createdVehicle = new this.vehicleModel(createVehicleDto);
    return createdVehicle.save();
  }

  async findAll(): Promise<Vehicle[]> {
    return this.vehicleModel.find().populate('client').exec();
  }

  async findByClient(clientId: string): Promise<Vehicle[]> {
    return this.vehicleModel.find({ client: clientId }).exec();
  }

  async findByCustomerId(customerId: string): Promise<Vehicle[]> {
    
    const user = await this.usersService.findByCustomerId(customerId);
    if (!user) {
      throw new NotFoundException(`User with Customer ID "${customerId}" not found`);
    }
    return this.vehicleModel.find({ client: user._id }).exec();
  }

  async findOne(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleModel.findById(id).populate('client').exec();
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }
    return vehicle;
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<Vehicle> {
    const updatedVehicle = await this.vehicleModel
      .findByIdAndUpdate(id, updateVehicleDto, { new: true })
      .exec();
    if (!updatedVehicle) {
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }
    return updatedVehicle;
  }

  async remove(id: string): Promise<void> {
    const result = await this.vehicleModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }
  }

  async getModelsByType(type: VehicleType): Promise<string[]> {
    
    const models: Record<VehicleType, string[]> = {
      [VehicleType.AUTO]: ['Toyota', 'Honda', 'Ford', 'Tesla', 'BMW', 'Nissan'],
      [VehicleType.MOTORCYCLE]: ['Harley-Davidson', 'Honda', 'Yamaha'],
      [VehicleType.LIMOUSINE]: ['Lincoln Town Car', 'Chrysler 300 Limousine'],
      [VehicleType.BOAT]: ['Bayliner', 'Sea Ray', 'MasterCraft'],
      [VehicleType.TRAILER]: ['Utility Trailer', 'Enclosed Trailer'],
      [VehicleType.TRUCK]: ['Freightliner Cascadia', 'Peterbilt 389'],
      [VehicleType.OVERSIZED_TRUCK]: ['Kenworth W900', 'Mack Anthem'],
      [VehicleType.JETSKI]: ['Sea-Doo', 'Yamaha Waverunner'],
      [VehicleType.ATV]: ['Polaris Sportsman', 'Honda Foreman'],
      [VehicleType.MOPED]: ['Vespa', 'Honda Ruckus'],
      [VehicleType.SCOOTER]: ['Xiaomi Mi Electric Scooter', 'Segway Ninebot'],
      [VehicleType.OTHER]: [],
    };

    return models[type] || [];
  }
}
