import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PAGINATION_DEFAULTS, PRISMA_ERROR_CODES } from 'src/common/constants';
import { ProjectNotFoundError } from './errors/project-not-found.exception';
import { ProjectAlreadyExistsError } from './errors/project-already-exists.exception';
import { ClientNotFoundError } from '../clients/errors/client-not-found.exception';
import { ProjectsQueryDto } from './dto/projects-query.dto';
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
      description: 'Test project description',
    };

    const mockProject = {
      id: 'project-1',
      clientId: createDto.clientId,
      name: createDto.name,
      estimatedAmount: new Prisma.Decimal(createDto.estimatedAmount),
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
        description: mockProject.description,
      });

      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: {
          clientId: createDto.clientId,
          name: createDto.name,
          estimatedAmount: new Prisma.Decimal(createDto.estimatedAmount),
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
          reports: [{ income: new Prisma.Decimal('2000') }],
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
          reports: [{ income: new Prisma.Decimal('5000') }],
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
              where: { incomeDate: { not: null } },
              select: { income: true },
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

    it('should apply pagination params and correctly filter paid incomes', async () => {
      const projects = [
        {
          ...baseProject(
            'clhp000000000000000000001',
            'clhc000000000000000000001',
            'Project 1',
            '5000',
            'Description 1',
          ),
          reports: [{ income: new Prisma.Decimal('5000') }],
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
              where: { incomeDate: { not: null } },
              select: { income: true },
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
        reports: [{ income: new Prisma.Decimal('500') }],
        _count: { reports: 1 },
      });
      const result = await service.findOne('clhp000000000000000000001');
      expect(result.paymentProgress).toEqual({ totalPaid: 500 });
    });

    it('should sum multiple reports for totalPaid', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        ...baseProject,
        reports: [
          { income: new Prisma.Decimal('400') },
          { income: new Prisma.Decimal('600') },
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
    const updateDto: UpdateProjectDto = {
      clientId: 'client-2',
      name: 'Updated Project',
      estimatedAmount: 200000,
      description: 'Updated project description',
    };

    const mockUpdatedProject = {
      id: 'clhp000000000000000000001',
      clientId: updateDto.clientId,
      name: updateDto.name,
      estimatedAmount: new Prisma.Decimal(updateDto.estimatedAmount),
      description: updateDto.description,
    };

    it('should update a project', async () => {
      mockPrismaService.project.update.mockResolvedValue(mockUpdatedProject);

      const result = await service.update(
        'clhp000000000000000000001',
        updateDto,
      );

      expect(result.id).toBe('clhp000000000000000000001');
    });

    it('should throw ProjectNotFoundError when project does not exist', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.update.mockRejectedValue(error);

      await expect(
        service.update('clhp000000000000000000001', updateDto),
      ).rejects.toThrow(ProjectNotFoundError);
    });

    it('should throw ClientNotFoundError on invalid clientId', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.update.mockRejectedValue(error);

      await expect(
        service.update('clhp000000000000000000001', updateDto),
      ).rejects.toThrow(ClientNotFoundError);
    });

    it('should throw ProjectAlreadyExistsError on duplicate project', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });

      mockPrismaService.project.update.mockRejectedValue(error);

      await expect(
        service.update('clhp000000000000000000001', updateDto),
      ).rejects.toThrow(ProjectAlreadyExistsError);
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
  });
});
