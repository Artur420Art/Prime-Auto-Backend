import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VehicleType } from '../enums/vehicle-type.enum';
import { User } from '../../users/schemas/user.schema';

@Schema({ timestamps: true })
export class Vehicle extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  client: User;

  @Prop({ required: true, enum: VehicleType })
  type: VehicleType;

  @Prop({ required: true })
  purchaseDate: Date;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  vehicleModel: string;

  @Prop()
  auction: string;

  @Prop()
  city: string;

  @Prop()
  lot: string;

  @Prop({ required: true })
  vin: string;

  @Prop({ type: Number })
  autoPrice: number;

  @Prop()
  customerNotes: string;

  @Prop({ required: false })
  invoice: string;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
