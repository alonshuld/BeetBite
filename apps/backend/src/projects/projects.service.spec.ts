import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { ProjectClientAssignmentsService } from '../project-client-assignments/project-client-assignments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import {
  OPENING_BALANCE_TAG,
  PAGINATION_DEFAULTS,
  PRISMA_ERROR_CODES,
} from 'src/common/constants';
import { SubcontractorNotFoundError } from 'src/subcontractors/errors/subcontractor-not-found';
import { ProjectNotFoundError } from './errors/project-not-found.exception';
import { ProjectAlreadyExistsError } from './errors/project-already-exists.exception';
import { ClientNotFoundError } from '../clients/errors/client-not-found.exception';
import { ProjectClientChangeRequiresTransferError } from './errors/project-client-change-requires-transfer.error';
import { InitiatorNotFoundError } from 'src/initiators/errors/initiator-not-found.error';
import { ProjectsQueryDto } from './dto/projects-query.dto';
import { Prisma } from 'src/generated/client';
import { EntityHasRelatedRecordsError } from 'src/common/errors/entity-has-related-records.error';

type Mock = ReturnType<typeof vi.fn>;

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockPrismaService: {
    project: {
      create: Mock;
      findMany: Mock;
      findUnique: Mock;
      update: Mock;
      delete: Mock;
    };
    projectReport: {
      create: Mock;
    };
    subcontractor: {
      findUnique: Mock;
    };
    $transaction: Mock;
  } = {
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    projectReport: {
      create: vi.fn(),
    },
    subcontractor: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  // create() now writes the project and its first client assignment in one
  // transaction. Running the callback against the same mock keeps every
  // existing project.create expectation below working unchanged. Assigned after
  // the literal so the type is not self-referential.
  mockPrismaService.$transaction.mockImplementation(
    (callback: (tx: typeof mockPrismaService) => unknown) =>
      callback(mockPrismaService),
  );

  // Resolution is exercised by project-client-assignments.service.spec.ts.
  // An empty map here makes the read paths fall back to the project's cached
  // client, which is the behaviour every assertion below was written against.
  const mockAssignmentsService = {
    resolveClientsForMonth: vi.fn().mockResolvedValue(new Map()),
    createInitialAssignment: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ProjectClientAssignmentsService,
          useValue: mockAssignmentsService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateProjectDto = {
      clientId: 'client-1',
      name: 'Test Project',
      estimatedAmount: 100000,
      description: 'Test project description',
      requesterName: 'Jane Doe',
      location: '123 Main St, Tel Aviv',
    };

    const mockProject = {
      id: 'project-1',
      clientId: createDto.clientId,
      name: createDto.name,
      estimatedAmount: new Prisma.Decimal(createDto.estimatedAmount),
      description: createDto.description,
      requesterName: createDto.requesterName,
      location: createDto.location,
    };

    it('should create a project', async () => {
      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: mockProject.id,
        clientId: mockProject.clientId,
        name: mockProject.name,
        estimatedAmount: mockProject.estimatedAmount.toNumber(),
        description: mockProject.description,
        requesterName: mockProject.requesterName,
        location: mockProject.location,
      });

      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: {
          clientId: createDto.clientId,
          name: createDto.name,
          estimatedAmount: new Prisma.Decimal(createDto.estimatedAmount),
          description: createDto.description,
          requesterName: createDto.requesterName,
          location: createDto.location,
        },
      });
    });

    it('should throw ClientNotFoundError on invalid clientId', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        ClientNotFoundError,
      );
    });

    it('should throw ProjectAlreadyExistsError on duplicate project', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        ProjectAlreadyExistsError,
      );
    });

    describe('opening balance', () => {
      const openingBalance = {
        amount: 45000,
        month: '2026-03-01T00:00:00.000Z',
        subcontractorId: 'subcontractor-1',
        profitMargin: 12.5,
      };

      beforeEach(() => {
        mockPrismaService.subcontractor.findUnique.mockResolvedValue({
          id: openingBalance.subcontractorId,
        });
      });

      // 🔴 The section is optional. A project created without it must stay a
      // project with no reports — otherwise every "future project" (no reports
      // yet) filter silently loses its contents.
      it('creates no report when no opening balance is given', async () => {
        mockPrismaService.project.create.mockResolvedValue(mockProject);

        await service.create(createDto);

        expect(mockPrismaService.projectReport.create).not.toHaveBeenCalled();
      });

      it('creates exactly one report with one income entry for the amount', async () => {
        mockPrismaService.project.create.mockResolvedValue(mockProject);
        mockPrismaService.projectReport.create.mockResolvedValue({
          id: 'report-1',
        });

        await service.create({ ...createDto, openingBalance });

        expect(mockPrismaService.projectReport.create).toHaveBeenCalledTimes(1);
        const call = (
          mockPrismaService.projectReport.create.mock.calls as unknown[][]
        )[0][0] as {
          data: {
            projectId: string;
            subcontractorId: string;
            date: Date;
            profitMargin: Prisma.Decimal;
            incomeEntries: {
              create: {
                amount: Prisma.Decimal;
                incomeDate: Date;
                tag: string;
              };
            };
          };
        };

        expect(call.data.projectId).toBe(mockProject.id);
        expect(call.data.subcontractorId).toBe(openingBalance.subcontractorId);
        expect(call.data.date.toISOString()).toBe('2026-03-01T00:00:00.000Z');
        expect(call.data.profitMargin.toNumber()).toBe(
          openingBalance.profitMargin,
        );
        expect(call.data.incomeEntries.create.amount.toNumber()).toBe(
          openingBalance.amount,
        );
      });

      // 🔴 "How much have I already received?" — this money is in hand. A null
      // incomeDate files it as still owed and keeps it out of the project's
      // payment progress, which is the single figure the opening balance
      // exists to correct.
      it('marks the income as received, not pending', async () => {
        mockPrismaService.project.create.mockResolvedValue(mockProject);
        mockPrismaService.projectReport.create.mockResolvedValue({
          id: 'report-1',
        });

        await service.create({ ...createDto, openingBalance });

        const call = (
          mockPrismaService.projectReport.create.mock.calls as unknown[][]
        )[0][0] as {
          data: { incomeEntries: { create: { incomeDate: Date | null } } };
        };
        expect(call.data.incomeEntries.create.incomeDate).not.toBeNull();
      });

      // Payment progress counts client payments, so the money already in hand
      // is one; it was received VAT included, so the VAT is marked paid too.
      it('records the amount as one client payment and marks the VAT paid', async () => {
        mockPrismaService.project.create.mockResolvedValue(mockProject);
        mockPrismaService.projectReport.create.mockResolvedValue({
          id: 'report-1',
        });

        await service.create({ ...createDto, openingBalance });

        const call = (
          mockPrismaService.projectReport.create.mock.calls as unknown[][]
        )[0][0] as {
          data: {
            vatPaidAt: Date;
            clientPayments: {
              create: { amount: Prisma.Decimal; paymentDate: Date };
            };
          };
        };
        expect(call.data.clientPayments.create.amount.toNumber()).toBe(
          openingBalance.amount,
        );
        expect(call.data.clientPayments.create.paymentDate.toISOString()).toBe(
          '2026-03-01T00:00:00.000Z',
        );
        expect(call.data.vatPaidAt.toISOString()).toBe(
          '2026-03-01T00:00:00.000Z',
        );
      });

      it('tags the income entry so the synthetic origin is visible', async () => {
        mockPrismaService.project.create.mockResolvedValue(mockProject);
        mockPrismaService.projectReport.create.mockResolvedValue({
          id: 'report-1',
        });

        await service.create({ ...createDto, openingBalance });

        const call = (
          mockPrismaService.projectReport.create.mock.calls as unknown[][]
        )[0][0] as {
          data: { incomeEntries: { create: { tag: string } } };
        };
        expect(call.data.incomeEntries.create.tag).toBe(OPENING_BALANCE_TAG);
      });

      // 🔴 The report is written inside the same transaction as the project, so
      // a failure here takes the project with it. Postgres does the rollback;
      // what this asserts is that the write is inside the callback at all and
      // that the failure is not swallowed into a successful-looking create.
      it('fails the whole create when the report cannot be written', async () => {
        mockPrismaService.project.create.mockResolvedValue(mockProject);
        mockPrismaService.projectReport.create.mockRejectedValue(
          new Error('report write failed'),
        );

        await expect(
          service.create({ ...createDto, openingBalance }),
        ).rejects.toThrow('report write failed');

        expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      });

      // 🔴 Both the client and the subcontractor can be wrong here. A raw
      // P2003 does not reliably say which, and blaming the client for a bad
      // subcontractor sends the user hunting in the wrong place — so the
      // subcontractor is checked explicitly instead of being left to the
      // foreign key.
      it('names the subcontractor when it does not exist', async () => {
        mockPrismaService.project.create.mockResolvedValue(mockProject);
        mockPrismaService.subcontractor.findUnique.mockResolvedValue(null);

        await expect(
          service.create({ ...createDto, openingBalance }),
        ).rejects.toThrow(SubcontractorNotFoundError);
        expect(mockPrismaService.projectReport.create).not.toHaveBeenCalled();
      });

      it('still blames the client when the client foreign key fails', async () => {
        mockPrismaService.project.create.mockRejectedValue(
          new PrismaClientKnownRequestError('', {
            code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
            clientVersion: '1.0.0',
          }),
        );

        await expect(
          service.create({ ...createDto, openingBalance }),
        ).rejects.toThrow(ClientNotFoundError);
      });

      // The lookup costs a query, so it must not run for the common case of a
      // project with no opening balance at all.
      it('does not look up a subcontractor when no opening balance is given', async () => {
        mockPrismaService.project.create.mockResolvedValue(mockProject);

        await service.create(createDto);

        expect(
          mockPrismaService.subcontractor.findUnique,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('findAll', () => {
    const baseProject = (
      id: string,
      clientId: string,
      name: string,
      estimatedAmount: string,
      description: string,
    ) => ({
      id,
      clientId,
      name,
      estimatedAmount: new Prisma.Decimal(estimatedAmount),
      description,
    });

    it('should return a list of projects with default pagination and correct payment progress', async () => {
      const projects = [
        {
          ...baseProject(
            'clhp000000000000000000001',
            'clhc000000000000000000001',
            'Project 1',
            '5000',
            'Description 1',
          ),
          reports: [
            { clientPayments: [{ amount: new Prisma.Decimal('2000') }] },
          ],
          _count: { reports: 1 },
        },
        {
          ...baseProject(
            'clhp000000000000000000002',
            'clhc000000000000000000002',
            'Project 2',
            '10000',
            'Description 2',
          ),
          reports: [
            { clientPayments: [{ amount: new Prisma.Decimal('5000') }] },
          ],
          _count: { reports: 1 },
        },
      ];
      mockPrismaService.project.findMany.mockResolvedValue(projects);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: PAGINATION_DEFAULTS.LIMIT,
          include: {
            client: { select: { id: true, name: true } },
            reports: {
              select: {
                clientPayments: { select: { amount: true } },
              },
            },
            _count: {
              select: { reports: true },
            },
          },
        }),
      );
      expect(result[0].paymentProgress).toEqual({ totalPaid: 2000 });
      expect(result[1].paymentProgress).toEqual({ totalPaid: 5000 });
    });

    it('should apply pagination params and sum client payments', async () => {
      const projects = [
        {
          ...baseProject(
            'clhp000000000000000000001',
            'clhc000000000000000000001',
            'Project 1',
            '5000',
            'Description 1',
          ),
          reports: [
            { clientPayments: [{ amount: new Prisma.Decimal('5000') }] },
          ],
          _count: { reports: 1 },
        },
      ];
      mockPrismaService.project.findMany.mockResolvedValue(projects);

      const pagination: ProjectsQueryDto = { page: 2, limit: 1 };

      const result = await service.findAll(pagination);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          take: 1,
          include: {
            client: { select: { id: true, name: true } },
            reports: {
              select: {
                clientPayments: { select: { amount: true } },
              },
            },
            _count: {
              select: { reports: true },
            },
          },
        }),
      );
      expect(result[0].paymentProgress).toEqual({ totalPaid: 5000 });
    });
  });

  describe('findOne', () => {
    const baseProject = {
      id: 'clhp000000000000000000001',
      clientId: 'clhc000000000000000000001',
      name: 'Test Project',
      estimatedAmount: new Prisma.Decimal('1000'),
      description: 'Test project description',
    };

    it('should return a project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        ...baseProject,
        reports: [],
        _count: { reports: 0 },
      });
      const result = await service.findOne('clhp000000000000000000001');
      expect(result.id).toBe(baseProject.id);
    });

    it('should return totalPaid 0 when no project reports', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        ...baseProject,
        reports: [],
        _count: { reports: 0 },
      });
      const result = await service.findOne('clhp000000000000000000001');
      expect(result.paymentProgress).toEqual({ totalPaid: 0 });
    });

    it('should return correct totalPaid when project reports exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        ...baseProject,
        reports: [{ clientPayments: [{ amount: new Prisma.Decimal('500') }] }],
        _count: { reports: 1 },
      });
      const result = await service.findOne('clhp000000000000000000001');
      expect(result.paymentProgress).toEqual({ totalPaid: 500 });
    });

    it('should sum multiple reports for totalPaid', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        ...baseProject,
        reports: [
          { clientPayments: [{ amount: new Prisma.Decimal('400') }] },
          { clientPayments: [{ amount: new Prisma.Decimal('600') }] },
        ],
        _count: { reports: 2 },
      });
      const result = await service.findOne('clhp000000000000000000001');
      expect(result.paymentProgress).toEqual({ totalPaid: 1000 });
    });

    it('should throw ProjectNotFoundError when project not found', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);
      await expect(
        service.findOne('clhp000000000000000000001'),
      ).rejects.toThrow(ProjectNotFoundError);
    });
  });

  describe('update', () => {
    const projectId = 'clhp000000000000000000001';
    const updateDto: UpdateProjectDto = {
      clientId: 'client-2',
      name: 'Updated Project',
      estimatedAmount: 200000,
      description: 'Updated project description',
      requesterName: 'John Smith',
      location: '456 Side St, Haifa',
    };

    const mockUpdatedProject = {
      id: projectId,
      clientId: updateDto.clientId,
      name: updateDto.name,
      estimatedAmount: new Prisma.Decimal(updateDto.estimatedAmount),
      description: updateDto.description,
      requesterName: updateDto.requesterName,
      location: updateDto.location,
    };

    beforeEach(() => {
      // The project's current client, as cached on the row.
      mockPrismaService.project.findUnique.mockResolvedValue({
        clientId: 'client-2',
      });
    });

    it('should update a project', async () => {
      mockPrismaService.project.update.mockResolvedValue(mockUpdatedProject);

      const result = await service.update(projectId, updateDto);

      expect(result.id).toBe(projectId);
    });

    it('should never write clientId, even when it matches the current client', async () => {
      mockPrismaService.project.update.mockResolvedValue(mockUpdatedProject);

      await service.update(projectId, { ...updateDto, isDone: true });

      const args = mockPrismaService.project.update.mock.calls[0][0] as {
        where: unknown;
        data: Record<string, unknown>;
      };
      expect(args.where).toEqual({ id: projectId });
      expect(args.data).not.toHaveProperty('clientId');
      expect(args.data).toMatchObject({
        name: updateDto.name,
        description: updateDto.description,
        requesterName: updateDto.requesterName,
        location: updateDto.location,
        isDone: true,
      });
      expect(args.data.estimatedAmount).toEqual(
        new Prisma.Decimal(updateDto.estimatedAmount),
      );
    });

    it('should refuse a different client and write nothing', async () => {
      await expect(
        service.update(projectId, { ...updateDto, clientId: 'client-3' }),
      ).rejects.toThrow(ProjectClientChangeRequiresTransferError);

      expect(mockPrismaService.project.update).not.toHaveBeenCalled();
    });

    it('should answer the refusal with a 400 and its own code', async () => {
      const refusal = await service
        .update(projectId, { ...updateDto, clientId: 'client-3' })
        .catch((error: unknown) => error);

      expect(refusal).toBeInstanceOf(ProjectClientChangeRequiresTransferError);
      const error = refusal as ProjectClientChangeRequiresTransferError;
      expect(error.getStatus()).toBe(400);
      expect(error.code).toBe('PROJECT_CLIENT_CHANGE_REQUIRES_TRANSFER');
    });

    it('should throw ProjectNotFoundError when project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.update(projectId, updateDto)).rejects.toThrow(
        ProjectNotFoundError,
      );
      expect(mockPrismaService.project.update).not.toHaveBeenCalled();
    });

    it('should throw ProjectNotFoundError when the project vanishes mid-update', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.update.mockRejectedValue(error);

      await expect(service.update(projectId, updateDto)).rejects.toThrow(
        ProjectNotFoundError,
      );
    });

    it('should throw InitiatorNotFoundError on an invalid initiatorId, the only foreign key it writes', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.update.mockRejectedValue(error);

      await expect(
        service.update(projectId, { ...updateDto, initiatorId: 'missing' }),
      ).rejects.toThrow(InitiatorNotFoundError);
    });

    it('should throw ProjectAlreadyExistsError on duplicate project', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.update.mockRejectedValue(error);

      await expect(service.update(projectId, updateDto)).rejects.toThrow(
        ProjectAlreadyExistsError,
      );
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      mockPrismaService.project.delete.mockResolvedValue({});

      const result = await service.remove('clhp000000000000000000001');

      expect(result).toBeUndefined();
      expect(mockPrismaService.project.delete).toHaveBeenCalledWith({
        where: { id: 'clhp000000000000000000001' },
      });
    });

    it('should throw ProjectNotFoundError when project not found', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.delete.mockRejectedValue(error);

      await expect(service.remove('clhp000000000000000000001')).rejects.toThrow(
        ProjectNotFoundError,
      );
    });

    it('should throw EntityHasRelatedRecordsError when project has related records (P2003)', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.delete.mockRejectedValue(error);

      await expect(service.remove('clhp000000000000000000001')).rejects.toThrow(
        EntityHasRelatedRecordsError,
      );
    });
  });

  describe('updateLastApprovedFor', () => {
    it('should update only the lastApprovedFor field', async () => {
      mockPrismaService.project.update.mockResolvedValue({});

      await service.updateLastApprovedFor(
        'clhp000000000000000000001',
        'עבודות שלד + גמר',
      );

      expect(mockPrismaService.project.update).toHaveBeenCalledWith({
        where: { id: 'clhp000000000000000000001' },
        data: { lastApprovedFor: 'עבודות שלד + גמר' },
      });
    });

    it('should throw ProjectNotFoundError when project not found', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.update.mockRejectedValue(error);

      await expect(
        service.updateLastApprovedFor('clhp000000000000000000001', 'text'),
      ).rejects.toThrow(ProjectNotFoundError);
    });
  });
});
