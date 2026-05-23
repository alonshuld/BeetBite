import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route handler or controller as public, bypassing the global JwtAuthGuard.
 * Apply to any endpoint that must be accessible without a Bearer token (e.g. login).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
