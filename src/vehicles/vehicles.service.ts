import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Vehicle } from './schemas/vehicle.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleType } from './enums/vehicle-type.enum';
import { UsersService } from '../users/users.service';
import { BlobService } from '../common/blob/blob.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/pagination-response.dto';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
    private readonly usersService: UsersService,
    private readonly blobService: BlobService,
  ) {}

  private async resolveUserObjectId(
    idOrCustomerId: string,
  ): Promise<Types.ObjectId> {
    if (isValidObjectId(idOrCustomerId)) {
      return new Types.ObjectId(idOrCustomerId);
    }

    const user = await this.usersService.findByCustomerId(idOrCustomerId);
    if (!user) {
      this.logger.warn(
        `User with ID or Customer ID "${idOrCustomerId}" not found`,
      );
      throw new NotFoundException(
        `User with ID or Customer ID "${idOrCustomerId}" not found`,
      );
    }
    return user._id as Types.ObjectId;
  }

  async create(
    createVehicleDto: CreateVehicleDto,
    file?: Express.Multer.File,
  ): Promise<Vehicle> {
    this.logger.log(`Creating vehicle: ${createVehicleDto.vin}`);

    const clientObjectId = await this.resolveUserObjectId(
      createVehicleDto.client,
    );

    let invoiceId = createVehicleDto.invoiceId;
    if (file) {
      const blob = await this.blobService.upload(
        `invoices/${Date.now()}-${file.originalname}`,
        file.buffer,
        file.mimetype,
      );
      JSON.stringify(`saved invoice Id ${JSON.stringify(blob.pathname)}`)
      invoiceId = blob.url;
    }

    const createdVehicle = new this.vehicleModel({
      ...createVehicleDto,
      client: clientObjectId,
      invoiceId,
    });
    return createdVehicle.save();
  }

  async findAll(user: { userId: string; roles: string[] }): Promise<Vehicle[]> {
    this.logger.log(
      `Fetching vehicles for user: ${user.userId}, roles: ${user.roles}`,
    );

    const query: any = {};

    if (!user.roles.includes('admin')) {
      query.client = new Types.ObjectId(user.userId);
    }

    return this.vehicleModel
      .find(query)
      .populate('client', 'firstName lastName email customerId')
      .exec();
  }

  async findAllPaginated({
    user,
    paginationQuery,
  }: {
    user: { userId: string; roles: string[] };
    paginationQuery: PaginationQueryDto;
  }): Promise<PaginatedResponseDto<Vehicle>> {
    const { page = 1, limit = 10, search } = paginationQuery;
    this.logger.log(
      `Fetching vehicles with pagination - page: ${page}, limit: ${limit}, user: ${user.userId}`,
    );

    const query: any = {};

    if (!user.roles.includes('admin')) {
      query.client = new Types.ObjectId(user.userId);
    }

    if (search) {
      query.$or = [
        { vin: { $regex: search, $options: 'i' } },
        { vehicleModel: { $regex: search, $options: 'i' } },
        { lot: { $regex: search, $options: 'i' } },
        { auction: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      this.vehicleModel
        .find(query)
        .populate('client', 'firstName lastName email customerId companyName')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.vehicleModel.countDocuments(query).exec(),
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

  async update(
    id: string,
    updateVehicleDto: UpdateVehicleDto,
    file?: Express.Multer.File,
  ): Promise<Vehicle> {
    this.logger.log(`Updating vehicle with ID: ${id}`);

    const existingVehicle = await this.findOne(id);

    const updateData: any = { ...updateVehicleDto };
    if (updateVehicleDto.client) {
      updateData.client = await this.resolveUserObjectId(
        updateVehicleDto.client,
      );
    }

    if (file) {
      // Delete old invoice if it exists
      if (existingVehicle.invoiceId && existingVehicle.invoiceId.startsWith('http')) {
        try {
          await this.blobService.delete(existingVehicle.invoiceId);
        } catch (error) {
          this.logger.warn(`Failed to delete old invoice: ${error.message}`);
        }
      }

      const blob = await this.blobService.upload(
        `invoices/${Date.now()}-${file.originalname}`,
        file.buffer,
        file.mimetype,
      );
      updateData.invoiceId = blob.url;
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
    const vehicle = await this.findOne(id);

    if (vehicle.invoiceId && vehicle.invoiceId.startsWith('http')) {
      try {
        await this.blobService.delete(vehicle.invoiceId);
      } catch (error) {
        this.logger.warn(`Failed to delete invoice: ${error.message}`);
      }
    }

    const result = await this.vehicleModel.findByIdAndDelete(id).exec();
    if (!result) {
      this.logger.warn(`Vehicle with ID "${id}" not found for removal`);
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }
  }
}
