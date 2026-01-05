import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../auth/dto/register.dto';
import { Role } from './enums/role.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  private async generateUniqueCustomerId(): Promise<string> {
    this.logger.log('Generating unique customer ID');
    let customerId = '';
    let exists = true;
    while (exists) {
      customerId = Math.floor(1000000 + Math.random() * 9000000).toString();
      const user = await this.userModel.findOne({ customerId }).exec();
      if (!user) {
        exists = false;
      }
    }
    this.logger.log(`Generated customer ID: ${customerId}`);
    return customerId;
  }

  async create(
    registerDto: RegisterDto,
    roles: Role[] = [Role.CLIENT],
  ): Promise<User> {
    this.logger.log(`Creating user with email: ${registerDto.email}`);
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const customerId = await this.generateUniqueCustomerId();
    const createdUser = new this.userModel({
      ...registerDto,
      password: hashedPassword,
      roles,
      customerId,
    });
    return createdUser.save();
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.log(`Finding user by email: ${email}`);
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<User | null> {
    this.logger.log(`Finding user by ID: ${id}`);
    return this.userModel.findById(id).exec();
  }

  async findByCustomerId(customerId: string): Promise<User | null> {
    this.logger.log(`Finding user by customer ID: ${customerId}`);
    return this.userModel.findOne({ customerId }).exec();
  }

  async findAll(role?: Role): Promise<User[]> {
    this.logger.log(`Finding users${role ? ` with role: ${role}` : ''}`);
    const query = role ? { roles: role } : {};
    return this.userModel
      .find(query, {
        password: 0,
        roles: 0,
        createdAt: 0,
        updatedAt: 0,
        __v: 0,
      })
      .exec();
  }

  async updatePassword(
    email: string,
    newPasswordHash: string,
  ): Promise<User | null> {
    this.logger.log(`Updating password for user: ${email}`);
    return this.userModel
      .findOneAndUpdate(
        { email },
        {
          password: newPasswordHash,
          $inc: { tokenVersion: 1 },
        },
        { new: true },
      )
      .exec();
  }

  async updateEmail(oldEmail: string, newEmail: string): Promise<User | null> {
    this.logger.log(`Updating email for user: ${oldEmail} to ${newEmail}`);
    return this.userModel
      .findOneAndUpdate(
        { email: oldEmail },
        {
          email: newEmail,
          $inc: { tokenVersion: 1 },
        },
        { new: true },
      )
      .exec();
  }
}
