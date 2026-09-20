import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from 'src/generated/client';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientNotFoundError } from 'src/clients/errors/client-not-found.exception';
import { ProjectNotFoundError } from 'src/projects/errors/project-not-found.exception';
import { AssignmentNotFoundError } from './errors/assignment-not-found.error';
import { AssignmentMonthTakenError } from './errors/assignment-month-taken.error';
import { CannotRemoveEarliestAssignmentError } from './errors/cannot-remove-earliest-assignment.error';
import { TransferProjectDto } from './dto/transfer-project.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { ProjectClientAssignmentResponseDto } from './dto/project-client-assignment-response.dto';

/** A client as every month-scoped read path needs it. */
export interface ResolvedClient {
  id: string;
  name: string;
}

/** Anything that can run Prisma calls — the client itself or a transaction. */
type PrismaExecutor = Prisma.TransactionClient | PrismaService;

/**
 * Normalises any date to the first of its month, in UTC.
 *
 * Reports are stored on the first of their month, and a transfer is expressed
 * as "from month X" — so every effectiveFrom is a month boundary. Normalising
 * on the way in keeps the comparison in `resolveClientsForMonth` exact.
 */
export function startOfMonthUTC(date: string | Date): Date {
  const ref = new Date(date);
  return new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
}

/**
 * Owns the effective-dated relationship between projects and clients.
 *
 * A project belongs to one client at a time, and can change hands any number of
 * times. History is frozen: a month that has already happened keeps whichever
 * client owned it, forever.
 *
 * `Project.clientId` is a denormalised cache of the *current* client. This
 * service is its only writer. Never read it to answer a historical question —
 * use {@link resolveClientsForMonth}.
 */
@Injectable()
export class ProjectClientAssignmentsService {
  private readonly logger = new Logger(ProjectClientAssignmentsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Resolves which client owned each project in a given month.
   *
   * The answer for a project is the assignment with the greatest
   * `effectiveFrom` that is less than or equal to the first of that month.
   *
   * Every client-grouping read path in the app is already scoped to one month,
   * so this runs once per request and resolves in memory — no correlated
   * per-row subquery.
   *
   * @param month Any date inside the month of interest.
   * @param projectIds Optional narrowing; omit to resolve every project.
   * @returns projectId to the client that owned it that month.
   */
  async resolveClientsForMonth(
    month: string | Date,
    projectIds?: string[],
  ): Promise<Map<string, ResolvedClient>> {
    const asOf = startOfMonthUTC(month);

    const assignments =
      await this.prismaService.projectClientAssignment.findMany({
        where: {
          effectiveFrom: { lte: asOf },
          ...(projectIds ? { projectId: { in: projectIds } } : {}),
        },
        orderBy: { effectiveFrom: 'asc' },
        select: {
          projectId: true,
          client: { select: { id: true, name: true } },
        },
      });

    // Ascending order means the last write per project wins — which is the
    // assignment with the greatest effectiveFrom at or before this month.
    const resolved = new Map<string, ResolvedClient>();
    for (const assignment of assignments) {
      resolved.set(assignment.projectId, assignment.client);
    }
    return resolved;
  }

  /**
   * Creates the first assignment for a newly created project.
   *
   * Every project must have at least one assignment covering the whole of its
   * history — without one its reports resolve to no client and disappear from
   * every month-scoped view. Call this inside the same transaction that creates
   * the project.
   *
   * @param tx Transaction to run in.
   * @param projectId Project that was just created.
   * @param clientId Client it starts with.
   * @param effectiveFrom Optional start; defaults to the epoch so that reports
   *   back-dated to any month still resolve.
   */
  async createInitialAssignment(
    tx: PrismaExecutor,
    projectId: string,
    clientId: string,
    effectiveFrom?: string | Date,
  ): Promise<void> {
    await tx.projectClientAssignment.create({
      data: {
        projectId,
        clientId,
        effectiveFrom: effectiveFrom
          ? startOfMonthUTC(effectiveFrom)
          : new Date(Date.UTC(1970, 0, 1)),
      },
    });
  }

  /**
   * Transfers a project to a different client from a given month onward.
   *
   * Months before `effectiveFrom` are untouched — they keep whichever client
   * owned them.
   *
   * @param projectId Project to transfer.
   * @param dto New client and the first month they own it.
   * @returns The project's full ownership timeline after the transfer.
   */
  async transfer(
    projectId: string,
    dto: TransferProjectDto,
  ): Promise<ProjectClientAssignmentResponseDto[]> {
    const effectiveFrom = startOfMonthUTC(dto.effectiveFrom);

    try {
      await this.prismaService.$transaction(async (tx) => {
        await tx.projectClientAssignment.create({
          data: { projectId, clientId: dto.clientId, effectiveFrom },
        });
        await this.refreshProjectClientCache(tx, projectId);
      });
    } catch (error) {
      throw this.mapWriteError(error, projectId, effectiveFrom);
    }

    this.logger.log(
      `Project ${projectId} transferred to client ${dto.clientId} from ${effectiveFrom.toISOString().slice(0, 10)}`,
    );
    return this.findAllForProject(projectId);
  }

  /**
   * Corrects an existing assignment — usually because the month was wrong.
   *
   * @param assignmentId Assignment to correct.
   * @param dto Fields to change.
   * @returns The project's ownership timeline after the correction.
   */
  async update(
    assignmentId: string,
    dto: UpdateAssignmentDto,
  ): Promise<ProjectClientAssignmentResponseDto[]> {
    const existing =
      await this.prismaService.projectClientAssignment.findUnique({
        where: { id: assignmentId },
        select: { id: true, projectId: true },
      });
    if (!existing) throw new AssignmentNotFoundError(assignmentId);

    const effectiveFrom = dto.effectiveFrom
      ? startOfMonthUTC(dto.effectiveFrom)
      : undefined;

    try {
      await this.prismaService.$transaction(async (tx) => {
        await tx.projectClientAssignment.update({
          where: { id: assignmentId },
          data: {
            ...(dto.clientId ? { clientId: dto.clientId } : {}),
            ...(effectiveFrom ? { effectiveFrom } : {}),
          },
        });
        await this.refreshProjectClientCache(tx, existing.projectId);
      });
    } catch (error) {
      throw this.mapWriteError(error, existing.projectId, effectiveFrom);
    }

    return this.findAllForProject(existing.projectId);
  }

  /**
   * Removes an assignment, undoing a transfer.
   *
   * Refuses to remove a project's earliest assignment — that one covers the
   * whole of its history and something must.
   *
   * @param assignmentId Assignment to remove.
   * @returns The project's ownership timeline after the removal.
   */
  async remove(
    assignmentId: string,
  ): Promise<ProjectClientAssignmentResponseDto[]> {
    const existing =
      await this.prismaService.projectClientAssignment.findUnique({
        where: { id: assignmentId },
        select: { id: true, projectId: true, effectiveFrom: true },
      });
    if (!existing) throw new AssignmentNotFoundError(assignmentId);

    const earliest = await this.prismaService.projectClientAssignment.findFirst(
      {
        where: { projectId: existing.projectId },
        orderBy: { effectiveFrom: 'asc' },
        select: { id: true },
      },
    );
    if (earliest?.id === existing.id) {
      throw new CannotRemoveEarliestAssignmentError();
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.projectClientAssignment.delete({ where: { id: assignmentId } });
      await this.refreshProjectClientCache(tx, existing.projectId);
    });

    return this.findAllForProject(existing.projectId);
  }

  /**
   * Returns a project's full ownership timeline, oldest first.
   *
   * @param projectId Project to describe.
   */
  async findAllForProject(
    projectId: string,
  ): Promise<ProjectClientAssignmentResponseDto[]> {
    const assignments =
      await this.prismaService.projectClientAssignment.findMany({
        where: { projectId },
        orderBy: { effectiveFrom: 'asc' },
        select: {
          id: true,
          projectId: true,
          effectiveFrom: true,
          client: { select: { id: true, name: true } },
        },
      });

    return assignments.map((assignment) => ({
      id: assignment.id,
      projectId: assignment.projectId,
      clientId: assignment.client.id,
      clientName: assignment.client.name,
      effectiveFrom: assignment.effectiveFrom.toISOString(),
    }));
  }

  /**
   * Re-points `Project.clientId` at the assignment with the latest
   * `effectiveFrom`. The cache has exactly one writer and this is it.
   *
   * @param tx Transaction to run in.
   * @param projectId Project whose cache to refresh.
   */
  private async refreshProjectClientCache(
    tx: PrismaExecutor,
    projectId: string,
  ): Promise<void> {
    const latest = await tx.projectClientAssignment.findFirst({
      where: { projectId },
      orderBy: { effectiveFrom: 'desc' },
      select: { clientId: true },
    });
    if (!latest) return;

    await tx.project.update({
      where: { id: projectId },
      data: { clientId: latest.clientId },
    });
  }

  /**
   * Turns Prisma constraint failures into the domain errors the API exposes.
   *
   * @param error The error Prisma threw.
   * @param projectId Project being written.
   * @param effectiveFrom Month boundary being written, when there is one.
   */
  private mapWriteError(
    error: unknown,
    projectId: string,
    effectiveFrom?: Date,
  ): unknown {
    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
          return new AssignmentMonthTakenError(
            (effectiveFrom ?? new Date()).toISOString().slice(0, 10),
          );
        case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED:
          return new ClientNotFoundError('unknown');
        case PRISMA_ERROR_CODES.NOT_FOUND:
          return new ProjectNotFoundError(projectId);
      }
    }
    return error;
  }
}
