import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Vehicle } from './schemas/vehicle.schema';
import { memoryStorage } from 'multer';

import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/pagination-response.dto';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiCreatedResponse({ type: Vehicle })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'invoice', maxCount: 1 },
        { name: 'vehiclePhotos', maxCount: 25 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 12 * 1024 * 1024 }, // 12MB
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  create(
    @Body() createVehicleDto: CreateVehicleDto,
    @UploadedFiles()
    files?: {
      invoice?: Express.Multer.File[];
      vehiclePhotos?: Express.Multer.File[];
    },
  ) {
    const invoiceFile = files?.invoice?.[0];
    const photos = files?.vehiclePhotos ?? [];

    return this.vehiclesService.create({
      createVehicleDto,
      invoiceFile,
      photos,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles' })
  @ApiOkResponse({ type: [Vehicle] })
  findAll(@Req() req: { user: { userId: string; roles: string[] } }) {
    return this.vehiclesService.findAll(req.user);
  }

  @Get('paginated')
  @ApiOperation({ summary: 'Get paginated vehicles' })
  @ApiOkResponse({ type: PaginatedResponseDto<Vehicle> })
  findAllPaginated(
    @Req() req: { user: { userId: string; roles: string[] } },
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.vehiclesService.findAllPaginated({
      user: req.user,
      paginationQuery,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vehicle by ID' })
  @ApiOkResponse({ type: Vehicle })
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a vehicle' })
  @ApiOkResponse({ type: Vehicle })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'invoice', maxCount: 1 },
        { name: 'vehiclePhotos', maxCount: 25 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 12 * 1024 * 1024 }, // 12MB
      },
    ),
  )
  update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @UploadedFiles()
    files?: {
      invoice?: Express.Multer.File[];
      vehiclePhotos?: Express.Multer.File[];
    },
  ) {
    const invoiceFile = files?.invoice?.[0];
    const photos = files?.vehiclePhotos ?? [];

    return this.vehiclesService.update(
      id,
      updateVehicleDto,
      invoiceFile,
      photos,
    );
  }

  @Delete(':id/photos')
  @ApiOperation({
    summary: 'Delete a photo from a vehicle',
  })
  @ApiOkResponse({ type: Vehicle })
  deletePhoto(@Param('id') id: string, @Body('photoUrl') photoUrl: string) {
    return this.vehiclesService.deletePhoto({
      id,
      photoUrl,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiOkResponse({ description: 'Vehicle deleted successfully' })
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}
