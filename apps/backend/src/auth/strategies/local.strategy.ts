import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { AuthService } from '../auth.service';
import { User } from '../../generated/client';

/**
 * Passport local strategy that validates username and password credentials.
 * Used exclusively by LocalAuthGuard on the POST /auth/login endpoint.
 * @param authService Service that performs credential validation
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super();
  }

  /**
   * Validate the provided credentials against the database.
   * Passport calls this automatically when LocalAuthGuard is active.
   * @param username Submitted username
   * @param password Submitted plaintext password
   * @returns The authenticated User record
   * @throws UnauthorizedException if credentials are invalid
   */
  async validate(username: string, password: string): Promise<User> {
    const user = await this.authService.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
