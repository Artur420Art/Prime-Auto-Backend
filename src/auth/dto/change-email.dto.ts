import { IsEmail, IsNotEmpty } from 'class-validator';
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
  refresh_token: string;
}
