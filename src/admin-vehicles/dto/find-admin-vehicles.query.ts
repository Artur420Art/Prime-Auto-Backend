import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { VehicleType } from '../../vehicles/enums/vehicle-type.enum';

export class FindAdminVehiclesQueryDto {
  @ApiPropertyOptional({ example: 'BMW' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  mark?: string;

  @ApiPropertyOptional({ enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;
}
