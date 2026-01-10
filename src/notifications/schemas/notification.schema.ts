import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ required: true })
  message: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  reason?: string;

  @Prop({ required: true })
  createdBy: string; // Admin user ID who created the notification
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
