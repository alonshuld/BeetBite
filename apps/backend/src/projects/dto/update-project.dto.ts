import { OmitType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

/**
 * An opening balance is a creation-only concern: it exists to record what a
 * project brought in *before* it was entered, and there is nothing to back-date
 * once the project is in the system with reports of its own.
 *
 * Omitting it here is load-bearing, not tidiness. `update()` spreads this DTO
 * straight into `prisma.project.update`, so an inherited `openingBalance` would
 * reach Prisma as an unknown column and fail the request.
 *
 * `clientId` stays required but is never written: it must be the project's
 * current client, and a different one is refused with
 * `PROJECT_CLIENT_CHANGE_REQUIRES_TRANSFER`. Changing clients goes through
 * `POST /projects/:id/transfer`, which keeps the client history in step.
 */
export class UpdateProjectDto extends OmitType(CreateProjectDto, [
  'openingBalance',
] as const) {}
