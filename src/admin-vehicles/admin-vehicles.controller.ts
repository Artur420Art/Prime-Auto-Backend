import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { AdminVehiclesService } from './admin-vehicles.service';
import { CreateAdminVehicleDto } from './dto/create-admin-vehicle.dto';
import { FindAdminVehiclesQueryDto } from './dto/find-admin-vehicles.query';
import { UpdateAdminVehicleDto } from './dto/update-admin-vehicle.dto';
import { AdminVehicle } from './schemas/admin-vehicle.schema';

@ApiTags('admin-vehicles')
@Controller('admin-vehicles')
export class AdminVehiclesController {
  constructor(private readonly adminVehiclesService: AdminVehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Create admin vehicle (public)' })
  @ApiCreatedResponse({ type: AdminVehicle })
  create(@Body() dto: CreateAdminVehicleDto) {
    return this.adminVehiclesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List admin vehicles (public)' })
  @ApiOkResponse({ type: [AdminVehicle] })
  findAll(@Query() query: FindAdminVehiclesQueryDto) {
    return this.adminVehiclesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admin vehicle by id (public)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: AdminVehicle })
  findOne(@Param('id') id: string) {
    return this.adminVehiclesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update admin vehicle by id (public)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: AdminVehicle })
  update(@Param('id') id: string, @Body() dto: UpdateAdminVehicleDto) {
    return this.adminVehiclesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete admin vehicle by id (public)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'AdminVehicle deleted successfully' })
  remove(@Param('id') id: string) {
    return this.adminVehiclesService.remove(id);
  }
}

