import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { VehicleType } from '../../vehicles/enums/vehicle-type.enum';

@Schema({ timestamps: true, collection: 'gest_vehicles' })
export class AdminVehicle extends Document {
  @Prop({ required: false, trim: true })
  mark: string;

  @Prop({ required: false, enum: VehicleType })
  type: VehicleType;

  @Prop({ type: [String], default: [] })
  pictures?: string[];
}

export const AdminVehicleSchema = SchemaFactory.createForClass(AdminVehicle);

