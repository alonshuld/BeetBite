import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that triggers the local Passport strategy (username + password).
 * Apply to the login endpoint only; all other routes use JwtAuthGuard.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
