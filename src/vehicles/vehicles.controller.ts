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
  UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VehicleType } from './enums/vehicle-type.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';


@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('invoice'))
  @ApiConsumes('multipart/form-data')
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
      createVehicleDto.invoice = file.path || (file as any).location || 'memory:' + file.originalname;
    }
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  findAll() {
    return this.vehiclesService.findAll();
  }

  @Get('client/:clientId')
  findByClient(@Param('clientId') clientId: string) {
    return this.vehiclesService.findByClient(clientId);
  }

  @Get('customer/:customerId')
  findByCustomerId(@Param('customerId') customerId: string) {
    return this.vehiclesService.findByCustomerId(customerId);
  }

  @Get('models')
  getModelsByType(@Query('type') type: VehicleType) {
    return this.vehiclesService.getModelsByType(type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('invoice'))
  @ApiConsumes('multipart/form-data')
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
      updateVehicleDto.invoice = file.path || (file as any).location || 'memory:' + file.originalname;
    }
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}
