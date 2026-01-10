import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Notification message title',
    example: 'System Update',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the notification',
    example: 'The system will undergo maintenance on Saturday.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Reason for the notification',
    example: 'Scheduled maintenance for performance improvements',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
