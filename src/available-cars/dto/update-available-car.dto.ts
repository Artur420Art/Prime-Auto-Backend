import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

import { CreateAvailableCarDto } from './create-available-car.dto';

export class UpdateAvailableCarDto extends PartialType(CreateAvailableCarDto) {
  @ApiPropertyOptional({
    description: 'Array of photo URLs to delete',
    example: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deletePhotoUrls?: string[];
}
