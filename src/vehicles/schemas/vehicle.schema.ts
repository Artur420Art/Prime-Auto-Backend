import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

import { VehicleType } from '../enums/vehicle-type.enum';
import { User } from '../../users/schemas/user.schema';

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

  @ApiProperty({ type: [String], required: false })
  @Prop({ type: [String], default: [] })
  vehiclePhotos: string[];

  @ApiProperty({ required: false })
  @Prop({ default: false })
  paid: boolean;

  @ApiProperty({ required: false })
  @Prop({ default: false })
  shippingPaid: boolean;

  @ApiProperty({ required: false })
  @Prop({ default: false })
  insurance: boolean;

  @ApiProperty({ required: false })
  @Prop()
  vehiclePdf?: string;

  @ApiProperty({ required: false })
  @Prop()
  insurancePdf?: string;

  @ApiProperty({ required: false })
  @Prop()
  shippingPdf?: string;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);

// Indexes for performance optimization
VehicleSchema.index({ client: 1 });
VehicleSchema.index({ vin: 1 });
VehicleSchema.index({ createdAt: -1 });
VehicleSchema.index({ type: 1 });
VehicleSchema.index({ purchaseDate: -1 });
// Compound indexes for common query patterns
VehicleSchema.index({ client: 1, createdAt: -1 });
VehicleSchema.index({ client: 1, type: 1 });
