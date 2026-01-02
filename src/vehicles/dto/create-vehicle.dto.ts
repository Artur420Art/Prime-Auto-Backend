import { IsEnum, IsNumber, IsString, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';
import { VehicleType } from '../enums/vehicle-type.enum';
import { ApiProperty } from "@nestjs/swagger";

export class CreateVehicleDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  client: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(VehicleType)
  type: VehicleType;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  purchaseDate: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  year: number;

  @IsNotEmpty()
  @IsString()
  vehicleModel: string;

  @IsOptional()
  @IsString()
  auction?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  lot?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  vin: string;

  @ApiProperty()
  @IsString()
  autoPrice: number;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  @IsString()
  invoice?: string;
}
