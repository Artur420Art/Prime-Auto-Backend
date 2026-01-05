import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/schemas/user.schema';

@Schema({ timestamps: true })
export class Shipping extends Document {
  @ApiProperty({ type: String })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @ApiProperty()
  @Prop({ required: true })
  city: string;

  @ApiProperty()
  @Prop({ required: true, type: Number, min: 0 })
  shipping: number;
}

export const ShippingSchema = SchemaFactory.createForClass(Shipping);
ShippingSchema.index({ user: 1, city: 1 }, { unique: true });
