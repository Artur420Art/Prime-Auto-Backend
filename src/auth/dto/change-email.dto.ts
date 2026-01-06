import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeEmailDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  oldEmail: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  newEmail: string;
}

export class RefreshToken {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
