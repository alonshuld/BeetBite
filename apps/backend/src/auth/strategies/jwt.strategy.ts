import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  username: string;
}

/**
 * Passport JWT strategy that validates Bearer tokens on every protected request.
 * Reads the secret from configuration so the app never hardcodes credentials.
 * @param configService Application configuration for JWT secret
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret', ''),
    });
  }

  /**
   * Transform the verified JWT payload into the request user object.
   * Passport attaches the return value to `req.user`.
   * @param payload Decoded JWT payload containing sub and username
   * @returns Simplified user identity attached to the request
   */
  validate(payload: JwtPayload): { userId: string; username: string } {
    return { userId: payload.sub, username: payload.username };
  }
}
