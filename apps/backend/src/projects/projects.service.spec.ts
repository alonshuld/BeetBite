import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { ProjectNotFoundError } from './errors/project-not-found.exception';
import { ProjectAlreadyExistsError } from './errors/project-already-exists.exception';
import { ClientNotFoundError } from '../clients/errors/client-not-found.exception';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { Prisma } from 'src/generated/client';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectReport: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateProjectDto = {
      clientId: 'client-1',
      name: 'Test Project',
      estimatedAmount: 100000,
      finishDate: '2026-01-10T00:00:00.000Z',
      description: 'Test project description',
    };

    const mockProject = {
      id: 'project-1',
      clientId: createDto.clientId,
      name: createDto.name,
      estimatedAmount: new Prisma.Decimal(createDto.estimatedAmount),
      finishDate: new Date(createDto.finishDate),
      description: createDto.description,
    };

    it('should create a project', async () => {
      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: mockProject.id,
        clientId: mockProject.clientId,
        name: mockProject.name,
        estimatedAmount: mockProject.estimatedAmount.toNumber(),
        finishDate: mockProject.finishDate.toISOString(),
        description: mockProject.description,
      });

      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: {
          clientId: createDto.clientId,
          name: createDto.name,
          estimatedAmount: new Prisma.Decimal(createDto.estimatedAmount),
          finishDate: new Date(createDto.finishDate),
          description: createDto.description,
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
  });

  describe('findAll', () => {
    const mockProjects = [
      {
        id: 'p1',
        clientId: 'c1',
        name: 'Project 1',
        estimatedAmount: new Prisma.Decimal('5000'),
        finishDate: new Date('2026-01-10T00:00:00.000Z'),
        description: 'Description 1',
      },
      {
        id: 'p2',
        clientId: 'c2',
        name: 'Project 2',
        estimatedAmount: new Prisma.Decimal('10000'),
        finishDate: new Date('2026-01-10T00:00:00.000Z'),
        description: 'Description 2',
      },
    ];

    it('should return a list of projects with default pagination and correct payment progress', async () => {
      const projects = mockProjects;
      const incomesSums = [
        { projectId: 'p1', _sum: { income: 2000 } },
        { projectId: 'p2', _sum: { income: 5000 } },
      ];
      mockPrismaService.$transaction.mockImplementation((callbackOrArray) => {
        if (typeof callbackOrArray === 'function') {
          // Simulate callback transaction (findAll)
          return callbackOrArray({
            project: { findMany: () => projects },
            projectReport: { groupBy: () => incomesSums },
          });
        }
        return [];
      });

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      // Project 1: estimatedAmount 5000, paid 2000
      expect(result[0].paymentProgress).toEqual({
        totalPaid: 2000,
        remainingAmount: 3000,
        percentagePaid: 40,
      });
      // Project 2: estimatedAmount 10000, paid 5000
      expect(result[1].paymentProgress).toEqual({
        totalPaid: 5000,
        remainingAmount: 5000,
        percentagePaid: 50,
      });
    });

    it('should apply pagination params and return correct payment progress', async () => {
      const projects = [mockProjects[0]];
      const incomesSums = [{ projectId: 'p1', _sum: { income: 5000 } }];
      mockPrismaService.$transaction.mockImplementation((callbackOrArray) => {
        if (typeof callbackOrArray === 'function') {
          // Simulate callback transaction (findAll)
          return callbackOrArray({
            project: { findMany: () => projects },
            projectReport: { groupBy: () => incomesSums },
          });
        }
        return [];
      });

      const pagination: PaginationQueryDto = {
        page: 2,
        limit: 1,
      };

      const result = await service.findAll(pagination);

      expect(result).toHaveLength(1);
      expect(result[0].paymentProgress).toEqual({
        totalPaid: 5000,
        remainingAmount: 0,
        percentagePaid: 100,
      });
    });
  });

  describe('findOne', () => {
    const mockProject = {
      id: 'p1',
      clientId: 'c1',
      name: 'Test Project',
      estimatedAmount: new Prisma.Decimal('1000'),
      finishDate: new Date('2026-01-10T00:00:00.000Z'),
      description: 'Test project description',
    };

    it('should return a project', async () => {
      const project = mockProject;
      const incomesSum = { _sum: { income: 0 } };
      mockPrismaService.$transaction.mockResolvedValue([project, incomesSum]);
      const result = await service.findOne('p1');
      expect(result.id).toBe(mockProject.id);
    });

    it('should return payment progress 0 when no project reports', async () => {
      const project = mockProject;
      const incomesSum = { _sum: { income: 0 } };
      mockPrismaService.$transaction.mockResolvedValue([project, incomesSum]);
      const result = await service.findOne('p1');
      expect(result.paymentProgress).toEqual({
        totalPaid: 0,
        remainingAmount: 1000,
        percentagePaid: 0,
      });
    });

    it('should return partial payment progress when project reports exist but not complete', async () => {
      const project = mockProject;
      const incomesSum = { _sum: { income: 500 } };
      mockPrismaService.$transaction.mockResolvedValue([project, incomesSum]);
      const result = await service.findOne('p1');
      expect(result.paymentProgress).toEqual({
        totalPaid: 500,
        remainingAmount: 500,
        percentagePaid: 50,
      });
    });

    it('should return complete payment progress when project reports sum equals estimatedAmount', async () => {
      const project = mockProject;
      const incomesSum = { _sum: { income: 1000 } };
      mockPrismaService.$transaction.mockResolvedValue([project, incomesSum]);
      const result = await service.findOne('p1');
      expect(result.paymentProgress).toEqual({
        totalPaid: 1000,
        remainingAmount: 0,
        percentagePaid: 100,
      });
    });

    it('should throw ProjectNotFoundError when project not found', async () => {
      mockPrismaService.$transaction.mockResolvedValue([
        null,
        { _sum: { income: 0 } },
      ]);
      await expect(service.findOne('p1')).rejects.toThrow(ProjectNotFoundError);
    });
  });

  describe('update', () => {
    const updateDto: UpdateProjectDto = {
      clientId: 'client-2',
      name: 'Updated Project',
      estimatedAmount: 200000,
      finishDate: '2026-01-10T00:00:00.000Z',
      description: 'Updated project description',
    };

    const mockUpdatedProject = {
      id: 'p1',
      clientId: updateDto.clientId,
      name: updateDto.name,
      estimatedAmount: new Prisma.Decimal(updateDto.estimatedAmount),
      finishDate: new Date(updateDto.finishDate),
      description: updateDto.description,
    };

    it('should update a project', async () => {
      mockPrismaService.project.update.mockResolvedValue(mockUpdatedProject);

      const result = await service.update('p1', updateDto);

      expect(result.id).toBe('p1');
    });

    it('should throw ProjectNotFoundError when project does not exist', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.update.mockRejectedValue(error);

      await expect(service.update('p1', updateDto)).rejects.toThrow(
        ProjectNotFoundError,
      );
    });

    it('should throw ClientNotFoundError on invalid clientId', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.update.mockRejectedValue(error);

      await expect(service.update('p1', updateDto)).rejects.toThrow(
        ClientNotFoundError,
      );
    });

    it('should throw ProjectAlreadyExistsError on duplicate project', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.update.mockRejectedValue(error);

      await expect(service.update('p1', updateDto)).rejects.toThrow(
        ProjectAlreadyExistsError,
      );
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      mockPrismaService.project.delete.mockResolvedValue({});

      const result = await service.remove('p1');

      expect(result).toBeUndefined();
      expect(mockPrismaService.project.delete).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
    });

    it('should throw ProjectNotFoundError when project not found', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.delete.mockRejectedValue(error);

      await expect(service.remove('p1')).rejects.toThrow(ProjectNotFoundError);
    });
  });
});
