import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

import { CarCategory } from '../enums/car-category.enum';
import { EngineType } from '../enums/engine-type.enum';
import { Transmission } from '../enums/transmission.enum';

@Schema({ timestamps: true, collection: 'available_cars' })
export class AvailableCar extends Document {
  @ApiProperty()
  @Prop({ required: true })
  carModel: string;

  @ApiProperty()
  @Prop({ required: true })
  carYear: number;

  @ApiProperty()
  @Prop({ required: true, unique: true })
  carVin: string;

  @ApiProperty()
  @Prop({ required: true, type: Number })
  carPrice: number;

  @ApiProperty({ enum: CarCategory })
  @Prop({ required: true, enum: CarCategory })
  carCategory: CarCategory;

  @ApiProperty({ type: [String] })
  @Prop({ type: [String], default: [] })
  carPhotos: string[];

  @ApiProperty({ required: false })
  @Prop({ required: false })
  carDescription?: string;

  @ApiProperty({ enum: EngineType })
  @Prop({ required: true, enum: EngineType })
  engineType: EngineType;

  @ApiProperty()
  @Prop({ required: false, type: Number })
  engineHp: number;

  @ApiProperty()
  @Prop({ required: false, type: Number })
  engineSize: number;

  @ApiProperty()
  @Prop({ required: false })
  boughtPlace: string;

  @ApiProperty({ enum: Transmission })
  @Prop({ required: false, enum: Transmission })
  transmission: Transmission;
}

export const AvailableCarSchema = SchemaFactory.createForClass(AvailableCar);
