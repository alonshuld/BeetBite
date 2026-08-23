import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Payload required to authenticate and receive a JWT access token.
 */
export class LoginDto {
  /**
   * The account username.
   */
  @ApiProperty({ description: 'Account username' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  /**
   * The account password.
   */
  @ApiProperty({ description: 'Account password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
