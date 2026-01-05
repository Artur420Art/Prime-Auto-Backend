import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../enums/role.enum';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ unique: true, sparse: true })
  customerId: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  passport: string;

  @Prop({ required: true })
  password?: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  country: string;

  @Prop({ required: true })
  companyName: string;

  @Prop({ type: [String], enum: Role, default: [Role.CLIENT] })
  roles: Role[];

  @Prop({ default: 0 })
  tokenVersion: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
