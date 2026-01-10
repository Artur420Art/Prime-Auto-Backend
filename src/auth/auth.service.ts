import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../users/enums/role.enum';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    this.logger.log(`Login attempt for username: ${loginDto.username}`);
    const user = await this.usersService.findByUsername(loginDto.username);
    if (!user) {
      this.logger.warn(`Login failed: Username not found (${loginDto.username})`);
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.password) {
      this.logger.warn(`Login failed: User has no password set (${loginDto.username})`);
      throw new UnauthorizedException('Invalid username or password');
    }

    const isPasswordMatching = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordMatching) {
      this.logger.warn(`Login failed: Incorrect password for username (${loginDto.username})`);
      throw new UnauthorizedException('Invalid username or password');
    }

    this.logger.log(`Login successful for username: ${loginDto.username}`);
    return this.generateTokens(user);
  }

  private async generateTokens(user: any) {
    const payload = {
      email: user.email,
      sub: user._id,
      roles: user.roles,
      tokenVersion: user.tokenVersion,
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, {
        expiresIn: '7d', // Refresh token valid for 7 days
      }),
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);

      if (!user || user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Token revoked');
      }

      return this.generateTokens(user);
    } catch (e) {
      this.logger.warn(`Refresh token failed: ${e.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async registerClient(registerDto: RegisterDto) {
    this.logger.log(`Registering new client: ${registerDto.email}`);
    return this.usersService.create(registerDto, [Role.CLIENT]);
  }

  async registerAdmin(registerDto: RegisterDto) {
    this.logger.log(`Registering new admin: ${registerDto.email}`);
    return this.usersService.create(registerDto, [Role.ADMIN]);
  }

  async changePassword(changePasswordDto: ChangePasswordDto) {
    this.logger.log(
      `Password change request for email: ${changePasswordDto.email}`,
    );
    const user = await this.usersService.findByEmail(changePasswordDto.email);
    if (!user) {
      this.logger.warn(
        `Password change failed: User not found (${changePasswordDto.email})`,
      );
      throw new NotFoundException('User not found');
    }
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.usersService.updatePassword(
      changePasswordDto.email,
      hashedPassword,
    );
    this.logger.log(
      `Password changed successfully for email: ${changePasswordDto.email}`,
    );
    return { message: 'Password changed successfully and tokens revoked' };
  }

  async changeEmail(changeEmailDto: ChangeEmailDto) {
    this.logger.log(
      `Email change request from ${changeEmailDto.oldEmail} to ${changeEmailDto.newEmail}`,
    );
    const user = await this.usersService.findByEmail(changeEmailDto.oldEmail);
    if (!user) {
      this.logger.warn(
        `Email change failed: User not found (${changeEmailDto.oldEmail})`,
      );
      throw new NotFoundException('User not found');
    }
    await this.usersService.updateEmail(
      changeEmailDto.oldEmail,
      changeEmailDto.newEmail,
    );
    this.logger.log(
      `Email changed successfully from ${changeEmailDto.oldEmail} to ${changeEmailDto.newEmail}`,
    );
    return { message: 'Email changed successfully and tokens revoked' };
  }

  async getMe(userId: string) {
    this.logger.log(`Fetching user details for ID: ${userId}`);
    const user = await this.usersService.findById(userId);
    if (!user) {
      this.logger.warn(`User not found for ID: ${userId}`);
      throw new NotFoundException('User not found');
    }
    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  }

  async logout(userId: string) {
    this.logger.log(`Logout request for user ID: ${userId}`);
    await this.usersService.incrementTokenVersion(userId);
    this.logger.log(`User logged out successfully: ${userId}`);
    return { message: 'Logged out successfully' };
  }
}
