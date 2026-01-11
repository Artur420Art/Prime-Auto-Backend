import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  @ApiPropertyOptional({
    description: 'Array of photo URLs to delete',
    example: [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deletePhotoUrls?: string[];
}
