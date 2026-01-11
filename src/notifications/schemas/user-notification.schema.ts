import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'user_notifications' })
export class UserNotification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Notification', required: true })
  notificationId: Types.ObjectId;

  @Prop({ default: false })
  is_read: boolean;

  @Prop({ default: null })
  readedTime: Date;
}

export const UserNotificationSchema =
  SchemaFactory.createForClass(UserNotification);

// Create compound index for efficient queries
UserNotificationSchema.index(
  { userId: 1, notificationId: 1 },
  { unique: true },
);
UserNotificationSchema.index({ userId: 1, is_read: 1 });
