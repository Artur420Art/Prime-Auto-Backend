import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { VehicleType } from '../../vehicles/enums/vehicle-type.enum';

export class CreateAdminVehicleDto {
  @ApiPropertyOptional({ example: 'BMW' })
  @IsString()
  @IsOptional()
  mark?: string;

  @ApiPropertyOptional({ enum: VehicleType })
  @IsEnum(VehicleType)
  @IsOptional()
  type?: VehicleType;

  @ApiProperty({
    required: false,
    type: [String],
    example: ['https://.../img1.jpg', 'https://.../img2.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pictures?: string[];
}
