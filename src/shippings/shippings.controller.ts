import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ShippingsService } from './shippings.service';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Shipping } from './schemas/shipping.schema';

@ApiTags('shippings')
@ApiBearerAuth()
@Controller('shippings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingsController {
  constructor(private readonly shippingsService: ShippingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shipping record' })
  @ApiCreatedResponse({ type: Shipping })
  create(@Body() createShippingDto: CreateShippingDto, @Request() req) {
    if (!createShippingDto.user) {
      createShippingDto.user = req.user.userId;
    }
    return this.shippingsService.create(createShippingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shipping records for the current user' })
  @ApiOkResponse({ type: [Shipping] })
  findAll(@Request() req) {
    
    if (req.user.roles.includes(Role.ADMIN)) {
      return this.shippingsService.findAll();
    }
    return this.shippingsService.findAll(req.user.userId);
  }

  @Get('all')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all shipping records (Admin only)' })
  @ApiOkResponse({ type: [Shipping] })
  findAllAdmin() {
    return this.shippingsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shipping record by ID' })
  @ApiOkResponse({ type: Shipping })
  findOne(@Param('id') id: string) {
    return this.shippingsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shipping record' })
  @ApiOkResponse({ type: Shipping })
  update(@Param('id') id: string, @Body() updateShippingDto: UpdateShippingDto) {
    return this.shippingsService.update(id, updateShippingDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shipping record' })
  @ApiOkResponse({ description: 'Shipping record deleted successfully' })
  remove(@Param('id') id: string) {
    return this.shippingsService.remove(id);
  }

  @Post('increase-prices')
  @ApiOperation({ summary: 'Increase all shipping prices by a specified amount' })
  @ApiOkResponse({ description: 'All shipping prices increased successfully' })
  increasePrices(@Body('amount') amount: number, @Request() req) {
    if (req.user.roles.includes(Role.ADMIN)) {
      return this.shippingsService.increaseAllPrices(amount);
    }
    return this.shippingsService.increaseAllPrices(amount, req.user.userId);
  }
}
