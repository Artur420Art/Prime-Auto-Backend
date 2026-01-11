import {
  Injectable,
  OnModuleInit,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../auth/dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from './enums/role.enum';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/pagination-response.dto';

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
    try {
      return await createdUser.save();
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        const value = error.keyValue ? error.keyValue[field] : '';
        this.logger.warn(`Duplicate key error for ${field}: ${value}`);
        throw new ConflictException(`User with this ${field} already exists`);
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.log(`Finding user by email: ${email}`);
    return this.userModel.findOne({ email }).exec();
  }

  async findByUsername(username: string): Promise<User | null> {
    this.logger.log(`Finding user by username: ${username}`);
    return this.userModel.findOne({ username }).exec();
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
      .lean()
      .exec();
  }

  async findAllPaginated({
    paginationQuery,
    role,
  }: {
    paginationQuery: PaginationQueryDto;
    role?: Role;
  }): Promise<PaginatedResponseDto<User>> {
    const { page = 1, limit = 10, search } = paginationQuery;
    this.logger.log(
      `Finding users with pagination - page: ${page}, limit: ${limit}, role: ${role || 'all'}`,
    );

    const query: any = role ? { roles: role } : {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      this.userModel
        .find(query, {
          password: 0,
          tokenVersion: 0,
          __v: 0,
        })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
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
    try {
      return await this.userModel
        .findOneAndUpdate(
          { email: oldEmail },
          {
            email: newEmail,
            $inc: { tokenVersion: 1 },
          },
          { new: true },
        )
        .exec();
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        const value = error.keyValue ? error.keyValue[field] : '';
        this.logger.warn(`Duplicate key error for ${field}: ${value}`);
        throw new ConflictException(`User with this ${field} already exists`);
      }
      throw error;
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    this.logger.log(`Updating user with ID: ${id}`);
    const updateData: any = { ...updateUserDto };

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
      updateData.$inc = { tokenVersion: 1 };
    }

    if (updateData.email) {
      updateData.$inc = { ...updateData.$inc, tokenVersion: 1 };
    }

    try {
      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return updatedUser;
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        const value = error.keyValue ? error.keyValue[field] : '';
        this.logger.warn(`Duplicate key error for ${field}: ${value}`);
        throw new ConflictException(`User with this ${field} already exists`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting user with ID: ${id}`);
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async incrementTokenVersion(id: string): Promise<User | null> {
    this.logger.log(`Incrementing token version for user ID: ${id}`);
    return this.userModel
      .findByIdAndUpdate(id, { $inc: { tokenVersion: 1 } }, { new: true })
      .exec();
  }
}
