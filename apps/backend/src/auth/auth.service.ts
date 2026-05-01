import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { User } from '../generated/client';
import { LoginResponseDto } from './dto/login-response.dto';

/**
 * Service handling authentication logic.
 * Validates credentials and issues signed JWT tokens.
 * @param usersService Service used to look up user records
 * @param jwtService NestJS JWT service used to sign tokens
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Verify that a username and password match a stored user.
   * @param username The submitted username
   * @param password The submitted plaintext password
   * @returns The authenticated User record
   * @throws UserNotFoundError (from UsersService) if the username does not exist
   * @throws UnauthorizedException if the password does not match
   */
  async validateUser(username: string, password: string): Promise<User> {
    const user = await this.usersService.findByUsername(username);

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  /**
   * Issue a signed JWT for an authenticated user.
   * @param user The authenticated User record
   * @returns LoginResponseDto containing the signed access token
   */
  login(user: User): LoginResponseDto {
    const payload = { sub: user.id, username: user.username };

    return { accessToken: this.jwtService.sign(payload) };
  }
}
