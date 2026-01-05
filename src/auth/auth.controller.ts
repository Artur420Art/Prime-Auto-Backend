import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './guards/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register-admin-super')
  @ApiOperation({ summary: 'Create super admin (public endpoint for initial setup)' })
  async registerSuperAdmin(@Body() registerDto: RegisterDto) {
    return this.authService.registerAdmin(registerDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Post('register-client')
  @ApiOperation({ summary: 'Admin registers a new client' })
  async registerClient(@Body() registerDto: RegisterDto) {
    return this.authService.registerClient(registerDto);
  }

  @Post('forgot-password-change')
  @ApiOperation({ summary: 'Change password (forgot password flow) and revoke tokens' })
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(changePasswordDto);
  }

  @Post('change-email')
  @ApiOperation({ summary: 'Change email and revoke tokens' })
  async changeEmail(@Body() changeEmailDto: ChangeEmailDto) {
    return this.authService.changeEmail(changeEmailDto);
  }
}
