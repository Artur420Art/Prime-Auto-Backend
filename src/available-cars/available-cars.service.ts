import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AvailableCar } from './schemas/available-car.schema';
import { CreateAvailableCarDto } from './dto/create-available-car.dto';
import { UpdateAvailableCarDto } from './dto/update-available-car.dto';
import { AvailableCarsQueryDto } from './dto/available-cars-query.dto';
import { CarCategory } from './enums/car-category.enum';
import { S3Service } from '../common/s3/s3.service';
import { PaginatedResponseDto } from '../common/dto/pagination-response.dto';

@Injectable()
export class AvailableCarsService {
  private readonly logger = new Logger(AvailableCarsService.name);

  constructor(
    @InjectModel(AvailableCar.name)
    private availableCarModel: Model<AvailableCar>,
    private readonly s3Service: S3Service,
  ) {}

  async create({
    createAvailableCarDto,
    photos,
  }: {
    createAvailableCarDto: CreateAvailableCarDto;
    photos?: Express.Multer.File[];
  }): Promise<AvailableCar> {
    this.logger.log(`Creating available car: ${createAvailableCarDto.carVin}`);
    const existingCar = await this.availableCarModel
      .findOne({ carVin: createAvailableCarDto.carVin })
      .exec();

    if (existingCar) {
      throw new ConflictException(
        `Car with VIN "${createAvailableCarDto.carVin}" already exists`,
      );
    }

    const photoUrls: string[] = [];
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        const key = `available-cars/${createAvailableCarDto.carVin}/${Date.now()}-${photo.originalname}`;

        const { url } = await this.s3Service.upload({
          key,
          file: photo.buffer,
          contentType: photo.mimetype,
        });

        photoUrls.push(url);
      }
    }

    const createdCar = new this.availableCarModel({
      ...createAvailableCarDto,
      carPhotos: photoUrls,
    });

    return createdCar.save();
  }

  async findAll(): Promise<AvailableCar[]> {
    this.logger.log('Fetching all available cars');
    return this.availableCarModel.find().sort({ createdAt: -1 }).exec();
  }

  async findAllByCategory(carCategory?: CarCategory): Promise<AvailableCar[]> {
    this.logger.log(
      `Fetching available cars by category: ${carCategory || 'all'}`,
    );

    const query = carCategory ? { carCategory } : {};

    return this.availableCarModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findAllPaginated(
    queryDto: AvailableCarsQueryDto,
  ): Promise<PaginatedResponseDto<AvailableCar>> {
    const { page = 1, limit = 10, search, carCategory } = queryDto;
    this.logger.log(
      `Fetching available cars with pagination - page: ${page}, limit: ${limit}, category: ${carCategory || 'all'}`,
    );

    const query: any = {};

    // Filter by carCategory if provided
    if (carCategory) {
      query.carCategory = carCategory;
    }

    // Search across multiple fields
    if (search) {
      const searchConditions = [
        { carVin: { $regex: search, $options: 'i' } },
        { carModel: { $regex: search, $options: 'i' } },
        { carCategory: { $regex: search, $options: 'i' } },
      ];

      // Combine search with category filter if both exist
      if (carCategory) {
        query.$and = [{ carCategory }, { $or: searchConditions }];
        delete query.carCategory;
      } else {
        query.$or = searchConditions;
      }
    }

    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      this.availableCarModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.availableCarModel.countDocuments(query).exec(),
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

  async findOne(id: string): Promise<AvailableCar> {
    this.logger.log(`Fetching available car with ID: ${id}`);
    const car = await this.availableCarModel.findById(id).exec();

    if (!car) {
      this.logger.warn(`Available car with ID "${id}" not found`);
      throw new NotFoundException(`Available car with ID "${id}" not found`);
    }

    return car;
  }

  async findByVin(vin: string): Promise<AvailableCar> {
    this.logger.log(`Fetching available car with VIN: ${vin}`);
    const car = await this.availableCarModel.findOne({ carVin: vin }).exec();

    if (!car) {
      this.logger.warn(`Available car with VIN "${vin}" not found`);
      throw new NotFoundException(`Available car with VIN "${vin}" not found`);
    }

    return car;
  }

  async update({
    id,
    updateAvailableCarDto,
    photos,
  }: {
    id: string;
    updateAvailableCarDto: UpdateAvailableCarDto;
    photos?: Express.Multer.File[];
  }): Promise<AvailableCar> {
    this.logger.log(`Updating available car with ID: ${id}`);

    const existingCar = await this.findOne(id);

    const updateData: any = { ...updateAvailableCarDto };

  
    if (photos && photos.length > 0) {
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const key = `available-cars/${existingCar.carVin}/${Date.now()}-${photo.originalname}`;
        const { url } = await this.s3Service.upload({
          key,
          file: photo.buffer,
          contentType: photo.mimetype,
        });
        photoUrls.push(url);
      }
      // Append new public URLs to existing ones
      updateData.carPhotos = [...existingCar.carPhotos, ...photoUrls];
    }
    

    const updatedCar = await this.availableCarModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updatedCar) {
      this.logger.warn(`Available car with ID "${id}" not found for update`);
      throw new NotFoundException(`Available car with ID "${id}" not found`);
    }

    return updatedCar;
  }

  async deletePhoto({
    id,
    photoUrl,
  }: {
    id: string;
    photoUrl: string;
  }): Promise<{ status: string }> {
    this.logger.log(`Deleting photo from car with ID: ${id}`);

    const car = await this.findOne(id);

    if (!car.carPhotos.includes(photoUrl)) {
      throw new BadRequestException('Photo not found in car photos');
    }

    // Delete from S3
    try {
      const key = this.s3Service.extractKeyFromUrl(photoUrl);
      await this.s3Service.delete(key);
    } catch (error) {
      this.logger.warn(`Failed to delete photo from S3: ${error.message}`);
    }

    // Remove from database
    const updatedPhotos = car.carPhotos.filter((photo) => photo !== photoUrl);
    await this.availableCarModel
      .findByIdAndUpdate(id, { carPhotos: updatedPhotos }, { new: true })
      .exec();

    return { status: 'success' };
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing available car with ID: ${id}`);

    const car = await this.findOne(id);

    // Delete all photos from S3
    if (car.carPhotos && car.carPhotos.length > 0) {
      for (const photoUrl of car.carPhotos) {
        try {
          const key = this.s3Service.extractKeyFromUrl(photoUrl);
          await this.s3Service.delete(key);
        } catch (error) {
          this.logger.warn(`Failed to delete photo from S3: ${error.message}`);
        }
      }
    }

    const result = await this.availableCarModel.findByIdAndDelete(id).exec();

    if (!result) {
      this.logger.warn(`Available car with ID "${id}" not found for removal`);
      throw new NotFoundException(`Available car with ID "${id}" not found`);
    }
  }
}
