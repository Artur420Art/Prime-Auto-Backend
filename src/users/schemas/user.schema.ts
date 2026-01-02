import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../enums/role.enum';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ unique: true, sparse: true })
  customerId: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password?: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  location: string;

  @Prop({ required: true })
  companyName: string;

  @Prop({ type: [String], enum: Role, default: [Role.CLIENT] })
  roles: Role[];

}

export const UserSchema = SchemaFactory.createForClass(User);
