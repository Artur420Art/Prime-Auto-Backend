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
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/pagination-response.dto';
import { S3Service } from '../common/s3/s3.service';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
    private readonly usersService: UsersService,
    private readonly s3Service: S3Service,
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

  async create({
    createVehicleDto,
    invoiceFile,
    photos,
  }: {
    createVehicleDto: CreateVehicleDto;
    invoiceFile?: Express.Multer.File;
    photos?: Express.Multer.File[];
  }): Promise<Vehicle> {
    this.logger.log(`Creating vehicle: ${createVehicleDto.vin}`);

    const clientObjectId = await this.resolveUserObjectId(
      createVehicleDto.client,
    );

    let invoiceId = createVehicleDto.invoiceId;
    if (invoiceFile) {
      const key = `vehicles/${createVehicleDto.vin}/invoices/${Date.now()}-${invoiceFile.originalname}`;
      const { url } = await this.s3Service.upload({
        key,
        file: invoiceFile.buffer,
        contentType: invoiceFile.mimetype,
      });
      invoiceId = url;
    }

    const vehiclePhotos: string[] = [];
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        const key = `vehicles/${createVehicleDto.vin}/photos/${Date.now()}-${photo.originalname}`;
        const { url } = await this.s3Service.upload({
          key,
          file: photo.buffer,
          contentType: photo.mimetype,
        });
        vehiclePhotos.push(url);
      }
    }

    const createdVehicle = new this.vehicleModel({
      ...createVehicleDto,
      client: clientObjectId,
      invoiceId,
      vehiclePhotos,
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
    invoiceFile?: Express.Multer.File,
    photos?: Express.Multer.File[],
  ): Promise<Vehicle> {
    this.logger.log(`Updating vehicle with ID: ${id}`);

    const existingVehicle = await this.findOne(id);

    const updateData: any = { ...updateVehicleDto };
    if (updateVehicleDto.client) {
      updateData.client = await this.resolveUserObjectId(
        updateVehicleDto.client,
      );
    }

    // Start with existing photos
    let updatedPhotos = [...(existingVehicle.vehiclePhotos ?? [])];

    // Delete old photos if specified
    if (
      updateVehicleDto.deletePhotoUrls &&
      updateVehicleDto.deletePhotoUrls.length > 0
    ) {
      for (const photoUrl of updateVehicleDto.deletePhotoUrls) {
        if (updatedPhotos.includes(photoUrl)) {
          try {
            const key = this.s3Service.extractKeyFromUrl(photoUrl);
            await this.s3Service.delete(key);
          } catch (error) {
            this.logger.warn(
              `Failed to delete photo from S3: ${error.message}`,
            );
          }

          updatedPhotos = updatedPhotos.filter((p) => p !== photoUrl);
        }
      }
    }

    // Add new photos if provided
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        const key = `vehicles/${existingVehicle.vin}/photos/${Date.now()}-${photo.originalname}`;
        const { url } = await this.s3Service.upload({
          key,
          file: photo.buffer,
          contentType: photo.mimetype,
        });
        updatedPhotos.push(url);
      }
    }

    updateData.vehiclePhotos = updatedPhotos;
    delete updateData.deletePhotoUrls;

    if (invoiceFile) {
      // Delete old invoice if it exists
      if (
        existingVehicle.invoiceId &&
        existingVehicle.invoiceId.startsWith('http')
      ) {
        try {
          const key = this.s3Service.extractKeyFromUrl(
            existingVehicle.invoiceId,
          );
          await this.s3Service.delete(key);
        } catch (error) {
          this.logger.warn(`Failed to delete old invoice: ${error.message}`);
        }
      }

      const key = `vehicles/${existingVehicle.vin}/invoices/${Date.now()}-${invoiceFile.originalname}`;
      const { url } = await this.s3Service.upload({
        key,
        file: invoiceFile.buffer,
        contentType: invoiceFile.mimetype,
      });
      updateData.invoiceId = url;
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

  async deletePhoto({
    id,
    photoUrl,
  }: {
    id: string;
    photoUrl: string;
  }): Promise<{ status: string }> {
    this.logger.log(`Deleting photo from vehicle with ID: ${id}`);

    const vehicle = await this.findOne(id);

    if (!vehicle.vehiclePhotos?.includes(photoUrl)) {
      throw new BadRequestException('Photo not found in vehicle photos');
    }

    try {
      const key = this.s3Service.extractKeyFromUrl(photoUrl);
      await this.s3Service.delete(key);
    } catch (error) {
      this.logger.warn(`Failed to delete photo from S3: ${error.message}`);
    }

    const updatedPhotos = vehicle.vehiclePhotos.filter((p) => p !== photoUrl);
    await this.vehicleModel
      .findByIdAndUpdate(id, { vehiclePhotos: updatedPhotos }, { new: true })
      .exec();

    return { status: 'success' };
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing vehicle with ID: ${id}`);
    const vehicle = await this.findOne(id);

    if (vehicle.vehiclePhotos && vehicle.vehiclePhotos.length > 0) {
      for (const photoUrl of vehicle.vehiclePhotos) {
        try {
          const key = this.s3Service.extractKeyFromUrl(photoUrl);
          await this.s3Service.delete(key);
        } catch (error) {
          this.logger.warn(`Failed to delete photo from S3: ${error.message}`);
        }
      }
    }

    if (vehicle.invoiceId && vehicle.invoiceId.startsWith('http')) {
      try {
        const key = this.s3Service.extractKeyFromUrl(vehicle.invoiceId);
        await this.s3Service.delete(key);
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
