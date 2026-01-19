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
  ) { }

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

  private async uploadOrUpdateFile({
    file,
    existingUrl,
    folder,
    prefix,
    vin,
  }: {
    file: Express.Multer.File;
    existingUrl?: string;
    folder: string;
    prefix: string;
    vin: string;
  }): Promise<string> {
    if (existingUrl && existingUrl.startsWith('http')) {
      try {
        const key = this.s3Service.extractKeyFromUrl(existingUrl);
        await this.s3Service.delete(key);
      } catch (error) {
        this.logger.warn(`Failed to delete old file: ${error.message}`);
      }
    }

    const key = `vehicles/${vin}/${folder}/${prefix}-${Date.now()}-${file.originalname}`;
    const { url } = await this.s3Service.upload({
      key,
      file: file.buffer,
      contentType: file.mimetype,
    });
    return url;
  }

  async create({
    createVehicleDto,
    invoiceFile,
    vehiclePdfFile,
    insurancePdfFile,
    shippingPdfFile,
    photos,
  }: {
    createVehicleDto: CreateVehicleDto;
    invoiceFile?: Express.Multer.File;
    vehiclePdfFile?: Express.Multer.File;
    insurancePdfFile?: Express.Multer.File;
    shippingPdfFile?: Express.Multer.File;
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

    let vehiclePdf: string | undefined = undefined;
    if (vehiclePdfFile) {
      const key = `vehicles/${createVehicleDto.vin}/pdfs/vehicle-${Date.now()}-${vehiclePdfFile.originalname}`;
      const { url } = await this.s3Service.upload({
        key,
        file: vehiclePdfFile.buffer,
        contentType: vehiclePdfFile.mimetype,
      });
      vehiclePdf = url;
    }

    let insurancePdf: string | undefined = undefined;
    if (insurancePdfFile) {
      const key = `vehicles/${createVehicleDto.vin}/pdfs/insurance-${Date.now()}-${insurancePdfFile.originalname}`;
      const { url } = await this.s3Service.upload({
        key,
        file: insurancePdfFile.buffer,
        contentType: insurancePdfFile.mimetype,
      });
      insurancePdf = url;
    }

    let shippingPdf: string | undefined = undefined;
    if (shippingPdfFile) {
      const key = `vehicles/${createVehicleDto.vin}/pdfs/shipping-${Date.now()}-${shippingPdfFile.originalname}`;
      const { url } = await this.s3Service.upload({
        key,
        file: shippingPdfFile.buffer,
        contentType: shippingPdfFile.mimetype,
      });
      shippingPdf = url;
    }

    const vehiclePhotos: string[] = [];
    if (photos && photos.length > 0) {
      // Prepare all files for batch upload
      const filesToUpload = photos.map((photo, index) => ({
        key: `vehicles/${createVehicleDto.vin}/photos/${Date.now()}-${index}-${photo.originalname}`,
        file: photo.buffer,
        contentType: photo.mimetype,
      }));

      // Upload all photos in parallel
      const uploadResults = await this.s3Service.uploadBatch({
        files: filesToUpload,
      });

      vehiclePhotos.push(...uploadResults.map((result) => result.url));
    }

    const createdVehicle = new this.vehicleModel({
      ...createVehicleDto,
      client: clientObjectId,
      invoiceId,
      vehiclePdf,
      insurancePdf,
      shippingPdf,
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
      .lean()
      .exec() as any;
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
        .lean()
        .exec() as any,
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

  async update({
    id,
    updateVehicleDto,
    invoiceFile,
    vehiclePdfFile,
    insurancePdfFile,
    shippingPdfFile,
    photos,
  }: {
    id: string;
    updateVehicleDto: UpdateVehicleDto;
    invoiceFile?: Express.Multer.File;
    vehiclePdfFile?: Express.Multer.File;
    insurancePdfFile?: Express.Multer.File;
    shippingPdfFile?: Express.Multer.File;
    photos?: Express.Multer.File[];
  }): Promise<Vehicle> {
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

    // Handle photo reordering if specified
    if (
      updateVehicleDto.reorderedPhotoUrls &&
      updateVehicleDto.reorderedPhotoUrls.length > 0
    ) {
      this.logger.log('Reordering photos');

      // Validate that vehicle has photos
      if (
        !existingVehicle.vehiclePhotos ||
        existingVehicle.vehiclePhotos.length === 0
      ) {
        throw new BadRequestException('Vehicle has no photos to reorder');
      }

      // Validate that all provided URLs exist in the vehicle's photos
      const invalidUrls = updateVehicleDto.reorderedPhotoUrls.filter(
        (url) => !existingVehicle.vehiclePhotos.includes(url),
      );

      if (invalidUrls.length > 0) {
        throw new BadRequestException(
          `The following photo URLs do not belong to this vehicle: ${invalidUrls.join(', ')}`,
        );
      }

      // Validate that all vehicle photos are included in the reorder
      if (
        updateVehicleDto.reorderedPhotoUrls.length !==
        existingVehicle.vehiclePhotos.length
      ) {
        throw new BadRequestException(
          `All photos must be included in the reorder. Expected ${existingVehicle.vehiclePhotos.length} photos, but received ${updateVehicleDto.reorderedPhotoUrls.length}`,
        );
      }

      updatedPhotos = updateVehicleDto.reorderedPhotoUrls;
    }

    // Delete old photos if specified (in parallel)
    if (
      updateVehicleDto.deletePhotoUrls &&
      updateVehicleDto.deletePhotoUrls.length > 0
    ) {
      const keysToDelete: string[] = [];

      for (const photoUrl of updateVehicleDto.deletePhotoUrls) {
        if (updatedPhotos.includes(photoUrl)) {
          const key = this.s3Service.extractKeyFromUrl(photoUrl);
          keysToDelete.push(key);
          updatedPhotos = updatedPhotos.filter((p) => p !== photoUrl);
        }
      }

      if (keysToDelete.length > 0) {
        try {
          await this.s3Service.deleteBatch(keysToDelete);
        } catch (error) {
          this.logger.warn(`Failed to delete photos from S3: ${error.message}`);
        }
      }
    }

    // Add new photos if provided (in parallel)
    if (photos && photos.length > 0) {
      const filesToUpload = photos.map((photo, index) => ({
        key: `vehicles/${existingVehicle.vin}/photos/${Date.now()}-${index}-${photo.originalname}`,
        file: photo.buffer,
        contentType: photo.mimetype,
      }));

      const uploadResults = await this.s3Service.uploadBatch({
        files: filesToUpload,
      });

      updatedPhotos.push(...uploadResults.map((result) => result.url));
    }

    updateData.vehiclePhotos = updatedPhotos;
    delete updateData.deletePhotoUrls;
    delete updateData.reorderedPhotoUrls;

    if (invoiceFile) {
      updateData.invoiceId = await this.uploadOrUpdateFile({
        file: invoiceFile,
        existingUrl: existingVehicle.invoiceId,
        folder: 'invoices',
        prefix: 'invoice',
        vin: existingVehicle.vin,
      });
    }

    if (vehiclePdfFile) {
      updateData.vehiclePdf = await this.uploadOrUpdateFile({
        file: vehiclePdfFile,
        existingUrl: existingVehicle.vehiclePdf,
        folder: 'pdfs',
        prefix: 'vehicle',
        vin: existingVehicle.vin,
      });
    }

    if (insurancePdfFile) {
      updateData.insurancePdf = await this.uploadOrUpdateFile({
        file: insurancePdfFile,
        existingUrl: existingVehicle.insurancePdf,
        folder: 'pdfs',
        prefix: 'insurance',
        vin: existingVehicle.vin,
      });
    }

    if (shippingPdfFile) {
      updateData.shippingPdf = await this.uploadOrUpdateFile({
        file: shippingPdfFile,
        existingUrl: existingVehicle.shippingPdf,
        folder: 'pdfs',
        prefix: 'shipping',
        vin: existingVehicle.vin,
      });
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

    // Collect all keys to delete
    const keysToDelete: string[] = [];

    if (vehicle.vehiclePhotos && vehicle.vehiclePhotos.length > 0) {
      for (const photoUrl of vehicle.vehiclePhotos) {
        const key = this.s3Service.extractKeyFromUrl(photoUrl);
        keysToDelete.push(key);
      }
    }

    if (vehicle.invoiceId && vehicle.invoiceId.startsWith('http')) {
      const key = this.s3Service.extractKeyFromUrl(vehicle.invoiceId);
      keysToDelete.push(key);
    }

    if (vehicle.vehiclePdf && vehicle.vehiclePdf.startsWith('http')) {
      const key = this.s3Service.extractKeyFromUrl(vehicle.vehiclePdf);
      keysToDelete.push(key);
    }

    if (vehicle.insurancePdf && vehicle.insurancePdf.startsWith('http')) {
      const key = this.s3Service.extractKeyFromUrl(vehicle.insurancePdf);
      keysToDelete.push(key);
    }

    if (vehicle.shippingPdf && vehicle.shippingPdf.startsWith('http')) {
      const key = this.s3Service.extractKeyFromUrl(vehicle.shippingPdf);
      keysToDelete.push(key);
    }

    // Delete all files in parallel
    if (keysToDelete.length > 0) {
      try {
        await this.s3Service.deleteBatch(keysToDelete);
      } catch (error) {
        this.logger.warn(`Failed to delete files from S3: ${error.message}`);
      }
    }

    const result = await this.vehicleModel.findByIdAndDelete(id).exec();
    if (!result) {
      this.logger.warn(`Vehicle with ID "${id}" not found for removal`);
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }
  }
}
