import {
  IsEnum,
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { VehicleModel, VehicleType, Auction } from '../enums/vehicle-type.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  client: string;

  @ApiProperty({ enum: VehicleType })
  @IsNotEmpty()
  @IsEnum(VehicleType)
  type: VehicleType;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  purchaseDate: string;

  @ApiProperty()
  @IsEnum(VehicleModel)
  model: VehicleModel;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  year: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  vehicleModel: string;

  @ApiProperty({ enum: Auction, required: false })
  @IsOptional()
  auction?: Auction;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lot?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  vin: string;

  @ApiProperty()
  @IsString()
  autoPrice: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  invoice?: any;

  @ApiProperty({ type: 'string', required: false })
  @IsOptional()
  @IsString()
  invoiceId?: string;
}
