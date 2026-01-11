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
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { AvailableCarsService } from './available-cars.service';
import { CreateAvailableCarDto } from './dto/create-available-car.dto';
import { UpdateAvailableCarDto } from './dto/update-available-car.dto';
import { AvailableCarsQueryDto } from './dto/available-cars-query.dto';
import { CategoryFilterDto } from './dto/category-filter.dto';
import { AvailableCar } from './schemas/available-car.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { PaginatedResponseDto } from '../common/dto/pagination-response.dto';

@ApiTags('available-cars')
@Controller('available-cars')
export class AvailableCarsController {
  constructor(private readonly availableCarsService: AvailableCarsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new available car (Admin only)' })
  @ApiCreatedResponse({ type: AvailableCar })
  @UseInterceptors(
    FilesInterceptor('carPhotos', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
    }),
  )
  create(
    @Body() createAvailableCarDto: CreateAvailableCarDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|webp|gif)$/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    photos?: Express.Multer.File[],
  ) {
    return this.availableCarsService.create({
      createAvailableCarDto,
      photos,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all available cars' })
  @ApiOkResponse({ type: [AvailableCar] })
  findAll() {
    return this.availableCarsService.findAll();
  }

  @Get('by-category')
  @ApiOperation({
    summary: 'Get available cars filtered by category (no pagination)',
  })
  @ApiOkResponse({ type: [AvailableCar] })
  findByCategory(@Query() filter: CategoryFilterDto) {
    return this.availableCarsService.findAllByCategory(filter.carCategory);
  }

  @Get('paginated')
  @ApiOperation({
    summary: 'Get paginated available cars with optional category filter',
  })
  @ApiOkResponse({ type: PaginatedResponseDto<AvailableCar> })
  findAllPaginated(@Query() query: AvailableCarsQueryDto) {
    return this.availableCarsService.findAllPaginated(query);
  }

  @Get('vin/:vin')
  @ApiOperation({ summary: 'Get an available car by VIN' })
  @ApiOkResponse({ type: AvailableCar })
  findByVin(@Param('vin') vin: string) {
    return this.availableCarsService.findByVin(vin);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an available car by ID' })
  @ApiOkResponse({ type: AvailableCar })
  findOne(@Param('id') id: string) {
    return this.availableCarsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update an available car (Admin only)' })
  @ApiOkResponse({ type: AvailableCar })
  @UseInterceptors(
    FilesInterceptor('carPhotos', 25, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  update(
    @Param('id') id: string,
    @Body() updateAvailableCarDto: UpdateAvailableCarDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|webp|gif)$/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    photos?: Express.Multer.File[],
  ) {
    return this.availableCarsService.update({
      id,
      updateAvailableCarDto,
      photos,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an available car (Admin only)' })
  @ApiOkResponse({ description: 'Available car deleted successfully' })
  remove(@Param('id') id: string) {
    return this.availableCarsService.remove(id);
  }

  @Delete(':id/photos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a photo from an available car (Admin only)',
  })
  @ApiOkResponse({ type: AvailableCar })
  deletePhoto(@Param('id') id: string, @Body('photoUrl') photoUrl: string) {
    return this.availableCarsService.deletePhoto({
      id,
      photoUrl,
    });
  }
}
