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
  UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags, ApiOperation, ApiResponse, ApiOkResponse, ApiCreatedResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Vehicle } from './schemas/vehicle.schema';


@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('invoice'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiCreatedResponse({ type: Vehicle })
  create(
    @Body() createVehicleDto: CreateVehicleDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
        ],
        fileIsRequired: false,
      }),
    ) file?: Express.Multer.File,
  ) {
    if (file) {
      createVehicleDto.invoiceId = 'testIds';
    }
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles' })
  @ApiOkResponse({ type: [Vehicle] })
  findAll(@Req() req: any) {
    return this.vehiclesService.findAll(req.user);
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
    ) file?: Express.Multer.File,
  ) {
    if (file) {
      // In the future this will be an ID from a bucket/storage service
      updateVehicleDto.invoiceId = file.path || (file as any).location || 'memory:' + file.originalname;
    }
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiOkResponse({ description: 'Vehicle deleted successfully' })
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}
