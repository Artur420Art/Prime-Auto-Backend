import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumberString } from 'class-validator';

export class NotificationStatsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: '1',
  })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: '20',
  })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
