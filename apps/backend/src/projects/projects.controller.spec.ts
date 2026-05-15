import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { ProjectBasicResponseDto } from './dto/project-basic-response.dto';
import { ProjectsQueryDto } from './dto/projects-query.dto';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const mockProjectsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a project', async () => {
      const createDto: CreateProjectDto = {
        clientId: 'client-1',
        name: 'Test Project',
        estimatedAmount: 100000,
        finishDate: '2026-12-31',
        description: 'Test project description',
      };

      const expectedResult: ProjectBasicResponseDto = {
        id: 'project-1',
        clientId: 'client-1',
        name: 'Test Project',
        estimatedAmount: 100000,
        finishDate: '2026-12-31',
        description: 'Test project description',
        isDone: false,
      };

      mockProjectsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockProjectsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw if project already exists', async () => {
      mockProjectsService.create.mockRejectedValue(
        new Error('Project already exists'),
      );

      await expect(
        controller.create({
          clientId: 'client-1',
          name: 'Duplicate Project',
          estimatedAmount: 1000,
          finishDate: '2026-01-01',
          description: 'A description',
        }),
      ).rejects.toThrow('Project already exists');
    });
  });

  describe('findAll', () => {
    it('should return a list of projects', async () => {
      const expectedResult: ProjectResponseDto[] = [
        {
          id: 'p1',
          clientId: 'c1',
          name: 'Project 1',
          estimatedAmount: 5000,
          finishDate: '',
          description: 'Description 1',
          isDone: false,
          paymentProgress: { totalPaid: 2000 },
        },
        {
          id: 'p2',
          clientId: 'c2',
          name: 'Project 2',
          estimatedAmount: 10000,
          finishDate: '',
          description: 'Description 2',
          isDone: false,
          paymentProgress: { totalPaid: 5000 },
        },
      ];

      mockProjectsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockProjectsService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should forward pagination params to the service', async () => {
      const pagination = { page: 2, limit: 1 } as ProjectsQueryDto;

      const expectedResult: ProjectResponseDto[] = [
        {
          id: 'p3',
          clientId: 'c3',
          name: 'Project 3',
          estimatedAmount: 7500,
          finishDate: '',
          description: 'Description 3',
          isDone: false,
          paymentProgress: { totalPaid: 0 },
        },
      ];

      mockProjectsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(pagination);

      expect(result).toEqual(expectedResult);
      expect(mockProjectsService.findAll).toHaveBeenCalledWith(pagination);
    });

    it('should return an empty array when no projects exist', async () => {
      mockProjectsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single project', async () => {
      const expectedResult: ProjectResponseDto = {
        id: 'p1',
        clientId: 'c1',
        name: 'Project 1',
        estimatedAmount: 5000,
        finishDate: '',
        description: 'Description 1',
        isDone: false,
        paymentProgress: { totalPaid: 2000 },
      };

      mockProjectsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('p1');

      expect(result).toEqual(expectedResult);
      expect(mockProjectsService.findOne).toHaveBeenCalledWith('p1');
    });

    it('should throw if project not found', async () => {
      mockProjectsService.findOne.mockRejectedValue(
        new Error('Project not found'),
      );

      await expect(controller.findOne('999')).rejects.toThrow(
        'Project not found',
      );
      expect(mockProjectsService.findOne).toHaveBeenCalledWith('999');
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      const updateDto: UpdateProjectDto = {
        clientId: 'client-2',
        name: 'Updated Project',
        estimatedAmount: 200000,
        finishDate: '2027-01-01',
        description: 'Updated description',
      };

      const expectedResult: ProjectBasicResponseDto = {
        id: 'p1',
        clientId: 'client-2',
        name: 'Updated Project',
        estimatedAmount: 200000,
        finishDate: '2027-01-01',
        description: 'Updated description',
        isDone: false,
      };

      mockProjectsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('p1', updateDto);

      expect(result).toEqual(expectedResult);
      expect(mockProjectsService.update).toHaveBeenCalledWith('p1', updateDto);
    });

    it('should throw if project not found', async () => {
      mockProjectsService.update.mockRejectedValue(
        new Error('Project not found'),
      );

      await expect(
        controller.update('p1', {} as UpdateProjectDto),
      ).rejects.toThrow('Project not found');
    });

    it('should throw if project name already exists', async () => {
      mockProjectsService.update.mockRejectedValue(
        new Error('Project already exists'),
      );

      await expect(
        controller.update('p1', {
          name: 'Duplicate Project',
        } as UpdateProjectDto),
      ).rejects.toThrow('Project already exists');
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      mockProjectsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('p1');

      expect(result).toBeUndefined();
      expect(mockProjectsService.remove).toHaveBeenCalledTimes(1);
      expect(mockProjectsService.remove).toHaveBeenCalledWith('p1');
    });

    it('should throw if project not found', async () => {
      mockProjectsService.remove.mockRejectedValue(
        new Error('Project not found'),
      );

      await expect(controller.remove('p1')).rejects.toThrow(
        'Project not found',
      );
    });
  });
});
