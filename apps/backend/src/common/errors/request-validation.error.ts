import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

import type { CodedError, ErrorParams } from './coded-error';

/** Constraints that mean "nothing was given", as opposed to "a bad value". */
const MISSING_CONSTRAINTS = new Set(['isNotEmpty', 'isDefined']);

interface FieldFailure {
  /** Dotted path into the body, e.g. `openingBalance.amount`, `payments.0.amount`. */
  path: string;
  missing: boolean;
  messages: string[];
}

function flatten(errors: ValidationError[], parent = ''): FieldFailure[] {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const constraints = error.constraints ?? {};
    const own: FieldFailure[] = Object.keys(constraints).length
      ? [
          {
            path,
            missing: Object.keys(constraints).some((c) =>
              MISSING_CONSTRAINTS.has(c),
            ),
            messages: Object.values(constraints),
          },
        ]
      : [];
    return [...own, ...flatten(error.children ?? [], path)];
  });
}

/**
 * The global ValidationPipe's rejection. Unlike Nest's default it names the
 * offending fields in `params`, so the client can tell the user — in their
 * language — exactly which fields to fix instead of a generic "invalid".
 *
 * `params.missing` / `params.invalid` are comma-separated field paths (params
 * only carry strings and numbers). Field names are part of the public API
 * shape, so they are sent even when detailed messages are disabled.
 */
export class RequestValidationError
  extends BadRequestException
  implements CodedError
{
  readonly code = 'VALIDATION_FAILED';
  readonly params: ErrorParams;

  constructor(errors: ValidationError[], detailedMessages = true) {
    const failures = flatten(errors);
    super(
      detailedMessages
        ? failures.flatMap((f) => f.messages)
        : 'Validation failed',
    );
    const missing = failures.filter((f) => f.missing).map((f) => f.path);
    const invalid = failures.filter((f) => !f.missing).map((f) => f.path);
    this.params = {
      ...(missing.length && { missing: missing.join(',') }),
      ...(invalid.length && { invalid: invalid.join(',') }),
    };
  }
}
