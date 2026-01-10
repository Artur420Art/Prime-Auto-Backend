import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { MarkNotificationReadDto } from './dto/mark-read.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { Role } from '../users/enums/role.enum';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Create a notification for all users (Admin only)',
  })
  @ApiCreatedResponse({
    description: 'Notification created and sent to all users',
  })
  create(@Body() createNotificationDto: CreateNotificationDto, @Request() req) {
    return this.notificationsService.create({
      createNotificationDto,
      adminId: req.user.userId,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the current user' })
  @ApiQuery({
    name: 'isRead',
    required: false,
    type: String,
    description: 'Filter by read status (true/false)',
  })
  @ApiOkResponse({ description: 'List of user notifications' })
  getUserNotifications(@Request() req, @Query('isRead') isRead?: string) {
    return this.notificationsService.getUserNotifications({
      userId: req.user.userId,
      isRead,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        unreadCount: { type: 'number' },
      },
    },
  })
  getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount({
      userId: req.user.userId,
    });
  }

  @Get('all')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all notifications (Admin only)' })
  @ApiOkResponse({ description: 'List of all notifications' })
  getAllNotifications() {
    return this.notificationsService.getAllNotifications();
  }

  @Patch('mark-read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiOkResponse({ description: 'Notification marked as read' })
  markAsRead(@Body() markReadDto: MarkNotificationReadDto, @Request() req) {
    return this.notificationsService.markAsRead({
      userId: req.user.userId,
      notificationId: markReadDto.notificationId,
    });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a notification (Admin only)' })
  @ApiOkResponse({ description: 'Notification deleted successfully' })
  deleteNotification(@Param('id') id: string) {
    return this.notificationsService.deleteNotification({
      notificationId: id,
    });
  }
}
