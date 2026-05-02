import { ApiProperty } from '@nestjs/swagger';

/**
 * Response returned after a successful login.
 * Contains a signed JWT that must be sent as a Bearer token on subsequent requests.
 */
export class LoginResponseDto {
  /**
   * Signed JWT access token.
   */
  @ApiProperty({ description: 'Signed JWT access token' })
  accessToken!: string;
}
