import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES, PAGINATION_DEFAULTS } from 'src/common/constants';
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
    };

    const mockProject = {
      id: 'project-1',
      clientId: createDto.clientId,
      name: createDto.name,
      estimatedAmount: new Prisma.Decimal(createDto.estimatedAmount),
      finishDate: new Date(createDto.finishDate),
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
      });

      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: {
          clientId: createDto.clientId,
          name: createDto.name,
          estimatedAmount: new Prisma.Decimal(createDto.estimatedAmount),
          finishDate: new Date(createDto.finishDate),
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
      },
      {
        id: 'p2',
        clientId: 'c2',
        name: 'Project 2',
        estimatedAmount: new Prisma.Decimal('10000'),
        finishDate: new Date('2026-01-10T00:00:00.000Z'),
      },
    ];

    it('should return a list of projects with default pagination', async () => {
      mockPrismaService.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: PAGINATION_DEFAULTS.LIMIT,
      });
    });

    it('should apply pagination params when provided', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([mockProjects[0]]);

      const pagination: PaginationQueryDto = {
        page: 2,
        limit: 1,
      };

      const result = await service.findAll(pagination);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
        skip: 1,
        take: 1,
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
    };

    it('should return a project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.findOne('p1');

      expect(result.id).toBe(mockProject.id);
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
    });

    it('should throw ProjectNotFoundError when project not found', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne('p1')).rejects.toThrow(ProjectNotFoundError);
    });
  });

  describe('update', () => {
    const updateDto: UpdateProjectDto = {
      clientId: 'client-2',
      name: 'Updated Project',
      estimatedAmount: 200000,
      finishDate: '2026-01-10T00:00:00.000Z',
    };

    const mockUpdatedProject = {
      id: 'p1',
      clientId: updateDto.clientId,
      name: updateDto.name,
      estimatedAmount: new Prisma.Decimal(updateDto.estimatedAmount),
      finishDate: new Date(updateDto.finishDate),
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
