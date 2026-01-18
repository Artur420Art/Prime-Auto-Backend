import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Notification } from './schemas/notification.schema';
import { UserNotification } from './schemas/user-notification.schema';
import { User } from '../users/schemas/user.schema';

import type { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    @InjectModel(UserNotification.name)
    private userNotificationModel: Model<UserNotification>,
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {}

  async create({ createNotificationDto, adminId }) {
    // Create the notification
    const notification = new this.notificationModel({
      ...createNotificationDto,
      createdBy: adminId,
    });
    await notification.save();

    // Get all users (only need IDs for performance)
    const allUsers = await this.userModel.find().select('_id').lean().exec();

    // Create user-notification records for all users
    const userNotifications = allUsers.map((user) => ({
      userId: user._id,
      notificationId: notification._id,
      is_read: false,
      readedTime: null,
    }));

    await this.userNotificationModel.insertMany(userNotifications);

    return {
      notification,
      sentToUsersCount: allUsers.length,
    };
  }

  async getUserNotifications({ userId, isRead }) {
    const query: any = { userId: new Types.ObjectId(userId) };

    if (isRead !== undefined) {
      query.is_read = isRead === 'true';
    }

    const userNotifications = await this.userNotificationModel
      .find(query)
      .populate('notificationId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return userNotifications.map((un) => ({
      _id: un._id,
      notification: un.notificationId,
      is_read: un.is_read,
      readedTime: un.readedTime,
    }));
  }

  async markAsRead({ userId, notificationId }) {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException('Invalid notification ID');
    }

    const userNotification = await this.userNotificationModel.findOne({
      userId: new Types.ObjectId(userId),
      notificationId: new Types.ObjectId(notificationId),
    });

    if (!userNotification) {
      throw new NotFoundException('Notification not found for this user');
    }

    if (userNotification.is_read) {
      return {
        message: 'Notification already marked as read',
        notification: userNotification,
      };
    }

    userNotification.is_read = true;
    userNotification.readedTime = new Date();
    await userNotification.save();

    return {
      message: 'Notification marked as read',
      notification: userNotification,
    };
  }

  async getUnreadCount({ userId }) {
    const count = await this.userNotificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      is_read: false,
    });

    return { unreadCount: count };
  }

  async deleteNotification({ notificationId }) {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException('Invalid notification ID');
    }

    const notification = await this.notificationModel.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Delete all user-notification records
    await this.userNotificationModel.deleteMany({
      notificationId: new Types.ObjectId(notificationId),
    });

    // Delete the notification
    await this.notificationModel.findByIdAndDelete(notificationId);

    return {
      message: 'Notification deleted successfully',
    };
  }

  async getAllNotifications() {
    return this.notificationModel.find().sort({ createdAt: -1 }).lean().exec();
  }

  async getNotificationStats({ notificationId }) {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException('Invalid notification ID');
    }

    const notification = await this.notificationModel
      .findById(notificationId)
      .lean()
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const [totalCount, readCount, unreadCount] = await Promise.all([
      this.userNotificationModel.countDocuments({
        notificationId: new Types.ObjectId(notificationId),
      }),
      this.userNotificationModel.countDocuments({
        notificationId: new Types.ObjectId(notificationId),
        is_read: true,
      }),
      this.userNotificationModel.countDocuments({
        notificationId: new Types.ObjectId(notificationId),
        is_read: false,
      }),
    ]);

    return {
      notification,
      stats: {
        totalUsers: totalCount,
        readCount,
        unreadCount,
        readPercentage:
          totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0,
      },
    };
  }

  async getNotificationReadUsers({ notificationId, page = '1', limit = '20' }) {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException('Invalid notification ID');
    }

    const notification = await this.notificationModel
      .findById(notificationId)
      .lean()
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [userNotifications, totalCount] = await Promise.all([
      this.userNotificationModel
        .find({
          notificationId: new Types.ObjectId(notificationId),
          is_read: true,
        })
        .populate(
          'userId',
          'firstName lastName email username customerId companyName',
        )
        .sort({ readedTime: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec(),
      this.userNotificationModel.countDocuments({
        notificationId: new Types.ObjectId(notificationId),
        is_read: true,
      }),
    ]);

    const users = userNotifications.map((un) => ({
      user: un.userId,
      readedTime: un.readedTime,
    }));

    return {
      notification,
      users,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
      },
    };
  }

  async getNotificationUnreadUsers({
    notificationId,
    page = '1',
    limit = '20',
  }) {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException('Invalid notification ID');
    }

    const notification = await this.notificationModel
      .findById(notificationId)
      .lean()
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [userNotifications, totalCount] = await Promise.all([
      this.userNotificationModel
        .find({
          notificationId: new Types.ObjectId(notificationId),
          is_read: false,
        })
        .populate({
          path: 'userId',
          select: 'firstName lastName email username customerId companyName',
          match: { role: { $ne: 'admin' } },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec(),
      this.userNotificationModel.countDocuments({
        notificationId: new Types.ObjectId(notificationId),
        is_read: false,
      }),
    ]);

    const users = userNotifications.map((un) => ({
      user: un.userId,
      createdAt: un['createdAt'],
    }));

    return {
      notification,
      users,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
      },
    };
  }

  async getAllNotificationsWithStats() {
    const notifications = await this.notificationModel
      .find()
      .populate({
        path: 'userId',
        select: 'firstName lastName email username customerId companyName',
        match: { role: { $ne: 'admin' } },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const notificationsWithStats = await Promise.all(
      notifications.map(async (notification) => {
        const [readCount, unreadCount] = await Promise.all([
          this.userNotificationModel.countDocuments({
            notificationId: notification._id,
            is_read: true,
          }),
          this.userNotificationModel.countDocuments({
            notificationId: notification._id,
            is_read: false,
          }),
        ]);

        const totalCount = readCount + unreadCount;

        return {
          ...notification,
          stats: {
            totalUsers: totalCount,
            readCount,
            unreadCount,
            readPercentage:
              totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0,
          },
        };
      }),
    );

    return notificationsWithStats;
  }
}
