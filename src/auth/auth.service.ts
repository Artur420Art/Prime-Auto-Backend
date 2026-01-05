import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
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
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (user && user.password && (await bcrypt.compare(loginDto.password, user.password))) {
      const payload = { 
        email: user.email, 
        sub: user._id, 
        roles: user.roles,
        tokenVersion: user.tokenVersion 
      };
      return {
        access_token: this.jwtService.sign(payload),
      };
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async registerClient(registerDto: RegisterDto) {
    return this.usersService.create(registerDto, [Role.CLIENT]);
  }

  async registerAdmin(registerDto: RegisterDto) {
    return this.usersService.create(registerDto, [Role.ADMIN]);
  }

  async changePassword(changePasswordDto: ChangePasswordDto) {
    const user = await this.usersService.findByEmail(changePasswordDto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.usersService.updatePassword(changePasswordDto.email, hashedPassword);
    return { message: 'Password changed successfully and tokens revoked' };
  }

  async changeEmail(changeEmailDto: ChangeEmailDto) {
    const user = await this.usersService.findByEmail(changeEmailDto.oldEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersService.updateEmail(changeEmailDto.oldEmail, changeEmailDto.newEmail);
    return { message: 'Email changed successfully and tokens revoked' };
  }
}
