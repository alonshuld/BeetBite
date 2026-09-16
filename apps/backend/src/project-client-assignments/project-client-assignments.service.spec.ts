import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ProjectClientAssignmentsService,
  startOfMonthUTC,
} from './project-client-assignments.service';
import { AssignmentNotFoundError } from './errors/assignment-not-found.error';
import { AssignmentMonthTakenError } from './errors/assignment-month-taken.error';
import { CannotRemoveEarliestAssignmentError } from './errors/cannot-remove-earliest-assignment.error';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';

const PROJECT_ID = 'project-1';
const CLIENT_A = { id: 'client-a', name: 'Client A' };
const CLIENT_B = { id: 'client-b', name: 'Client B' };
const CLIENT_C = { id: 'client-c', name: 'Client C' };

/**
 * `expect.objectContaining()` is typed as `any`, which makes nesting one inside
 * an object literal an unsafe assignment. Wrapping it once keeps the assertions
 * readable without scattering casts through them.
 */
const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape) as unknown;

describe('ProjectClientAssignmentsService', () => {
  let service: ProjectClientAssignmentsService;

  const mockPrismaService = {
    projectClientAssignment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectClientAssignmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectClientAssignmentsService>(
      ProjectClientAssignmentsService,
    );
    jest.clearAllMocks();
    // Run transaction callbacks against the same mock.
    mockPrismaService.$transaction.mockImplementation(
      (callback: (tx: typeof mockPrismaService) => unknown) =>
        callback(mockPrismaService),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startOfMonthUTC', () => {
    it('normalises any day of a month to its first, in UTC', () => {
      expect(startOfMonthUTC('2026-03-17').toISOString()).toBe(
        '2026-03-01T00:00:00.000Z',
      );
      expect(startOfMonthUTC('2026-03-01').toISOString()).toBe(
        '2026-03-01T00:00:00.000Z',
      );
    });
  });

  describe('resolveClientsForMonth', () => {
    // 🔴 The test that defines T14. History is frozen: a month that has already
    // happened keeps whichever client owned it, whatever happens later.
    it('resolves a month to the client that owned the project THAT month', async () => {
      // Project transferred from A to B effective March 2026.
      // Asking about February must still answer A.
      mockPrismaService.projectClientAssignment.findMany.mockResolvedValue([
        { projectId: PROJECT_ID, client: CLIENT_A },
      ]);

      const resolved = await service.resolveClientsForMonth('2026-02-01');

      expect(resolved.get(PROJECT_ID)).toEqual(CLIENT_A);
      // Only assignments effective at or before the first of that month count.
      expect(
        mockPrismaService.projectClientAssignment.findMany,
      ).toHaveBeenCalledWith(
        containing({
          where: containing({
            effectiveFrom: { lte: new Date('2026-02-01T00:00:00.000Z') },
          }),
          orderBy: { effectiveFrom: 'asc' },
        }),
      );
    });

    it('resolves the transfer month itself to the NEW client', async () => {
      // effectiveFrom is inclusive: "from month X" means X belongs to the new
      // client, so both assignments are in range and the later one wins.
      mockPrismaService.projectClientAssignment.findMany.mockResolvedValue([
        { projectId: PROJECT_ID, client: CLIENT_A },
        { projectId: PROJECT_ID, client: CLIENT_B },
      ]);

      const resolved = await service.resolveClientsForMonth('2026-03-01');

      expect(resolved.get(PROJECT_ID)).toEqual(CLIENT_B);
    });

    it('chains multiple transfers — A then B then C', async () => {
      // Rows arrive ascending by effectiveFrom; the greatest in range wins.
      mockPrismaService.projectClientAssignment.findMany.mockResolvedValue([
        { projectId: PROJECT_ID, client: CLIENT_A },
        { projectId: PROJECT_ID, client: CLIENT_B },
        { projectId: PROJECT_ID, client: CLIENT_C },
      ]);

      const resolved = await service.resolveClientsForMonth('2026-09-01');

      expect(resolved.get(PROJECT_ID)).toEqual(CLIENT_C);
    });

    it('resolves each project independently', async () => {
      mockPrismaService.projectClientAssignment.findMany.mockResolvedValue([
        { projectId: 'project-1', client: CLIENT_A },
        { projectId: 'project-2', client: CLIENT_B },
      ]);

      const resolved = await service.resolveClientsForMonth('2026-05-01');

      expect(resolved.get('project-1')).toEqual(CLIENT_A);
      expect(resolved.get('project-2')).toEqual(CLIENT_B);
    });

    // A project with no assignment covering the month resolves to nothing. The
    // read paths fall back to the project's cached client rather than dropping
    // the report off the screen — see the warn branch in each of them.
    it('returns an empty map when no assignment covers the month', async () => {
      mockPrismaService.projectClientAssignment.findMany.mockResolvedValue([]);

      const resolved = await service.resolveClientsForMonth('2020-01-01');

      expect(resolved.size).toBe(0);
    });

    it('narrows to the given projects when asked', async () => {
      mockPrismaService.projectClientAssignment.findMany.mockResolvedValue([]);

      await service.resolveClientsForMonth('2026-05-01', ['p1', 'p2']);

      expect(
        mockPrismaService.projectClientAssignment.findMany,
      ).toHaveBeenCalledWith(
        containing({
          where: containing({ projectId: { in: ['p1', 'p2'] } }),
        }),
      );
    });
  });

  describe('createInitialAssignment', () => {
    it('defaults to the epoch so any back-dated report still resolves', async () => {
      await service.createInitialAssignment(
        mockPrismaService as never,
        PROJECT_ID,
        CLIENT_A.id,
      );

      expect(
        mockPrismaService.projectClientAssignment.create,
      ).toHaveBeenCalledWith({
        data: {
          projectId: PROJECT_ID,
          clientId: CLIENT_A.id,
          effectiveFrom: new Date('1970-01-01T00:00:00.000Z'),
        },
      });
    });

    it('normalises a supplied start to the first of its month', async () => {
      await service.createInitialAssignment(
        mockPrismaService as never,
        PROJECT_ID,
        CLIENT_A.id,
        '2026-04-23',
      );

      expect(
        mockPrismaService.projectClientAssignment.create,
      ).toHaveBeenCalledWith({
        data: {
          projectId: PROJECT_ID,
          clientId: CLIENT_A.id,
          effectiveFrom: new Date('2026-04-01T00:00:00.000Z'),
        },
      });
    });
  });

  describe('transfer', () => {
    beforeEach(() => {
      mockPrismaService.projectClientAssignment.findFirst.mockResolvedValue({
        clientId: CLIENT_B.id,
      });
      mockPrismaService.projectClientAssignment.findMany.mockResolvedValue([]);
    });

    it('creates the assignment and refreshes the cached current client', async () => {
      await service.transfer(PROJECT_ID, {
        clientId: CLIENT_B.id,
        effectiveFrom: '2026-03-01',
      });

      expect(
        mockPrismaService.projectClientAssignment.create,
      ).toHaveBeenCalledWith({
        data: {
          projectId: PROJECT_ID,
          clientId: CLIENT_B.id,
          effectiveFrom: new Date('2026-03-01T00:00:00.000Z'),
        },
      });
      // Project.clientId is a derived cache with exactly one writer.
      expect(mockPrismaService.project.update).toHaveBeenCalledWith({
        where: { id: PROJECT_ID },
        data: { clientId: CLIENT_B.id },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('normalises a mid-month transfer date to the first of the month', async () => {
      await service.transfer(PROJECT_ID, {
        clientId: CLIENT_B.id,
        effectiveFrom: '2026-03-19',
      });

      expect(
        mockPrismaService.projectClientAssignment.create,
      ).toHaveBeenCalledWith(
        containing({
          data: containing({
            effectiveFrom: new Date('2026-03-01T00:00:00.000Z'),
          }),
        }),
      );
    });

    it('rejects a second transfer in a month the project already changes hands', async () => {
      mockPrismaService.projectClientAssignment.create.mockRejectedValue(
        new PrismaClientKnownRequestError('Unique constraint failed', {
          code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
          clientVersion: 'test',
        }),
      );

      await expect(
        service.transfer(PROJECT_ID, {
          clientId: CLIENT_B.id,
          effectiveFrom: '2026-03-01',
        }),
      ).rejects.toThrow(AssignmentMonthTakenError);
    });
  });

  describe('update', () => {
    it('corrects a mistyped transfer month and refreshes the cache', async () => {
      mockPrismaService.projectClientAssignment.findUnique.mockResolvedValue({
        id: 'assignment-1',
        projectId: PROJECT_ID,
      });
      mockPrismaService.projectClientAssignment.findFirst.mockResolvedValue({
        clientId: CLIENT_B.id,
      });
      mockPrismaService.projectClientAssignment.findMany.mockResolvedValue([]);

      await service.update('assignment-1', { effectiveFrom: '2026-04-01' });

      expect(
        mockPrismaService.projectClientAssignment.update,
      ).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: { effectiveFrom: new Date('2026-04-01T00:00:00.000Z') },
      });
      expect(mockPrismaService.project.update).toHaveBeenCalled();
    });

    it('throws when the assignment does not exist', async () => {
      mockPrismaService.projectClientAssignment.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.update('nope', { clientId: CLIENT_B.id }),
      ).rejects.toThrow(AssignmentNotFoundError);
    });
  });

  describe('remove', () => {
    it('refuses to remove a project’s earliest assignment', async () => {
      // Without a first assignment the project resolves to no client at all and
      // disappears from every month-scoped view.
      mockPrismaService.projectClientAssignment.findUnique.mockResolvedValue({
        id: 'assignment-1',
        projectId: PROJECT_ID,
        effectiveFrom: new Date('1970-01-01T00:00:00.000Z'),
      });
      mockPrismaService.projectClientAssignment.findFirst.mockResolvedValue({
        id: 'assignment-1',
      });

      await expect(service.remove('assignment-1')).rejects.toThrow(
        CannotRemoveEarliestAssignmentError,
      );
      expect(
        mockPrismaService.projectClientAssignment.delete,
      ).not.toHaveBeenCalled();
    });

    it('removes a later assignment and refreshes the cache', async () => {
      mockPrismaService.projectClientAssignment.findUnique.mockResolvedValue({
        id: 'assignment-2',
        projectId: PROJECT_ID,
        effectiveFrom: new Date('2026-03-01T00:00:00.000Z'),
      });
      mockPrismaService.projectClientAssignment.findFirst
        .mockResolvedValueOnce({ id: 'assignment-1' })
        .mockResolvedValueOnce({ clientId: CLIENT_A.id });
      mockPrismaService.projectClientAssignment.findMany.mockResolvedValue([]);

      await service.remove('assignment-2');

      expect(
        mockPrismaService.projectClientAssignment.delete,
      ).toHaveBeenCalledWith({ where: { id: 'assignment-2' } });
      // Undoing the transfer puts the cache back on the earlier client.
      expect(mockPrismaService.project.update).toHaveBeenCalledWith({
        where: { id: PROJECT_ID },
        data: { clientId: CLIENT_A.id },
      });
    });

    it('throws when the assignment does not exist', async () => {
      mockPrismaService.projectClientAssignment.findUnique.mockResolvedValue(
        null,
      );

      await expect(service.remove('nope')).rejects.toThrow(
        AssignmentNotFoundError,
      );
    });
  });

  describe('findAllForProject', () => {
    it('returns the timeline oldest first', async () => {
      mockPrismaService.projectClientAssignment.findMany.mockResolvedValue([
        {
          id: 'a1',
          projectId: PROJECT_ID,
          effectiveFrom: new Date('1970-01-01T00:00:00.000Z'),
          client: CLIENT_A,
        },
        {
          id: 'a2',
          projectId: PROJECT_ID,
          effectiveFrom: new Date('2026-03-01T00:00:00.000Z'),
          client: CLIENT_B,
        },
      ]);

      const timeline = await service.findAllForProject(PROJECT_ID);

      expect(timeline).toEqual([
        {
          id: 'a1',
          projectId: PROJECT_ID,
          clientId: CLIENT_A.id,
          clientName: CLIENT_A.name,
          effectiveFrom: '1970-01-01T00:00:00.000Z',
        },
        {
          id: 'a2',
          projectId: PROJECT_ID,
          clientId: CLIENT_B.id,
          clientName: CLIENT_B.name,
          effectiveFrom: '2026-03-01T00:00:00.000Z',
        },
      ]);
      expect(
        mockPrismaService.projectClientAssignment.findMany,
      ).toHaveBeenCalledWith(containing({ orderBy: { effectiveFrom: 'asc' } }));
    });
  });
});
