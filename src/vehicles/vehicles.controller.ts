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
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
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
    FileInterceptor('invoice', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  create(
    @Body() createVehicleDto: CreateVehicleDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.vehiclesService.create(createVehicleDto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles' })
  @ApiOkResponse({ type: [Vehicle] })
  findAll(@Req() req: any) {
    return this.vehiclesService.findAll(req.user);
  }

  @Get('paginated')
  @ApiOperation({ summary: 'Get paginated vehicles' })
  @ApiOkResponse({ type: PaginatedResponseDto<Vehicle> })
  findAllPaginated(
    @Req() req: any,
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
  @UseInterceptors(FileInterceptor('invoice'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a vehicle' })
  @ApiOkResponse({ type: Vehicle })
  update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          new FileTypeValidator({ fileType: 'pdf' }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.vehiclesService.update(id, updateVehicleDto, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiOkResponse({ description: 'Vehicle deleted successfully' })
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}
