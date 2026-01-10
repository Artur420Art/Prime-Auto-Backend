import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkNotificationReadDto {
  @ApiProperty({
    description: 'Notification ID to mark as read',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  notificationId: string;
}
