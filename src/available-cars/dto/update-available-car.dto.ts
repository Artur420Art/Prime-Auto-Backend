import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

import { CreateAvailableCarDto } from './create-available-car.dto';

export class UpdateAvailableCarDto extends PartialType(CreateAvailableCarDto) {
  @ApiPropertyOptional({
    description:
      'Array of photo URLs to delete (can be a single string or array of strings)',
    example: [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
    ],
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return [value];
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  deletePhotoUrls?: string[];
}
