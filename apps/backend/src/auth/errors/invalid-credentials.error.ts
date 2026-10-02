import { UnauthorizedException } from '@nestjs/common';

import type { CodedError } from '../../common/errors/coded-error';

/**
 * Raised when a login's password does not match the stored hash.
 */
export class InvalidCredentialsError
  extends UnauthorizedException
  implements CodedError
{
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Invalid credentials');
  }
}
