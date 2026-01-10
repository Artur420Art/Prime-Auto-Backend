import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VehicleType } from '../enums/vehicle-type.enum';
import { User } from '../../users/schemas/user.schema';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class Vehicle extends Document {
  @ApiProperty({ type: String })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  client: User;

  @ApiProperty({ enum: VehicleType })
  @Prop({ required: true, enum: VehicleType })
  type: VehicleType;

  @ApiProperty()
  @Prop({ required: true })
  purchaseDate: Date;

  @ApiProperty()
  @Prop({ required: true })
  year: number;

  @ApiProperty()
  @Prop({ required: true })
  vehicleModel: string;

  @ApiProperty({ required: false })
  @Prop()
  auction: string;

  @ApiProperty({ required: false })
  @Prop()
  city: string;

  @ApiProperty({ required: false })
  @Prop()
  lot: string;

  @ApiProperty()
  @Prop({ required: true })
  vin: string;

  @ApiProperty()
  @Prop({ type: Number })
  autoPrice: number;

  @ApiProperty({ required: false })
  @Prop()
  customerNotes: string;

  @ApiProperty({ required: false })
  @Prop({ required: false })
  invoiceId: string;

  @ApiProperty({ required: false })
  @Prop({ default: false })
  paid: boolean;

  @ApiProperty({ required: false })
  @Prop({ default: false })
  shippingPaid: boolean;

  @ApiProperty({ required: false })
  @Prop({ default: false })
  insurance: boolean;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
