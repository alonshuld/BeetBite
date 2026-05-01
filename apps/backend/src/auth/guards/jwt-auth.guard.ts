import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global JWT guard that protects all routes by default.
 * Routes decorated with @Public() are exempted from token verification.
 * @param reflector NestJS Reflector used to read route metadata
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Allow the request through if the route is marked public;
   * otherwise delegate to the standard JWT Bearer token check.
   * @param context Current execution context
   * @returns true if the request is allowed, false or an observable otherwise
   */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }
}
