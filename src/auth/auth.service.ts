import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../users/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (user && user.password && (await bcrypt.compare(loginDto.password, user.password))) {
      const payload = { email: user.email, sub: user._id, roles: user.roles };
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
}
