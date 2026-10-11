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
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
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
    vi.clearAllMocks();
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
        description: 'Test project description',
        requesterName: 'Jane Doe',
        location: '123 Main St, Tel Aviv',
      };

      const expectedResult: ProjectBasicResponseDto = {
        id: 'project-1',
        clientId: 'client-1',
        name: 'Test Project',
        estimatedAmount: 100000,
        description: 'Test project description',
        isDone: false,
        requesterName: 'Jane Doe',
        location: '123 Main St, Tel Aviv',
        lastApprovedFor: null,
        initiatorId: null,
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
          description: 'A description',
          requesterName: 'Jane Doe',
          location: '123 Main St, Tel Aviv',
        }),
      ).rejects.toThrow('Project already exists');
    });
  });

  describe('findAll', () => {
    it('should return a list of projects', async () => {
      const expectedResult: ProjectResponseDto[] = [
        {
          id: 'clhp000000000000000000001',
          clientId: 'clhc000000000000000000001',
          client: null,
          name: 'Project 1',
          estimatedAmount: 5000,
          description: 'Description 1',
          isDone: false,
          lastApprovedFor: null,
          initiatorId: null,
          hasReports: true,
          paymentProgress: { totalPaid: 2000 },
          requesterName: 'Jane Doe',
          location: '123 Main St, Tel Aviv',
        },
        {
          id: 'clhp000000000000000000002',
          clientId: 'clhc000000000000000000002',
          client: null,
          name: 'Project 2',
          estimatedAmount: 10000,
          description: 'Description 2',
          isDone: false,
          lastApprovedFor: null,
          initiatorId: null,
          hasReports: true,
          paymentProgress: { totalPaid: 5000 },
          requesterName: 'John Smith',
          location: '456 Side St, Haifa',
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
          client: null,
          name: 'Project 3',
          estimatedAmount: 7500,
          description: 'Description 3',
          isDone: false,
          lastApprovedFor: null,
          initiatorId: null,
          hasReports: false,
          paymentProgress: { totalPaid: 0 },
          requesterName: 'Jane Doe',
          location: '789 Third St, Jerusalem',
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
        id: 'clhp000000000000000000001',
        clientId: 'clhc000000000000000000001',
        client: null,
        name: 'Project 1',
        estimatedAmount: 5000,
        description: 'Description 1',
        isDone: false,
        lastApprovedFor: null,
        initiatorId: null,
        hasReports: true,
        paymentProgress: { totalPaid: 2000 },
        requesterName: 'Jane Doe',
        location: '123 Main St, Tel Aviv',
      };

      mockProjectsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('clhp000000000000000000001');

      expect(result).toEqual(expectedResult);
      expect(mockProjectsService.findOne).toHaveBeenCalledWith(
        'clhp000000000000000000001',
      );
    });

    it('should throw if project not found', async () => {
      mockProjectsService.findOne.mockRejectedValue(
        new Error('Project not found'),
      );

      await expect(
        controller.findOne('clh0000000000000000000999'),
      ).rejects.toThrow('Project not found');
      expect(mockProjectsService.findOne).toHaveBeenCalledWith(
        'clh0000000000000000000999',
      );
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      const updateDto: UpdateProjectDto = {
        clientId: 'client-2',
        name: 'Updated Project',
        estimatedAmount: 200000,
        description: 'Updated description',
        requesterName: 'John Smith',
        location: '456 Side St, Haifa',
      };

      const expectedResult: ProjectBasicResponseDto = {
        id: 'clhp000000000000000000001',
        clientId: 'client-2',
        name: 'Updated Project',
        estimatedAmount: 200000,
        description: 'Updated description',
        isDone: false,
        requesterName: 'John Smith',
        location: '456 Side St, Haifa',
        lastApprovedFor: null,
        initiatorId: null,
      };

      mockProjectsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        'clhp000000000000000000001',
        updateDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockProjectsService.update).toHaveBeenCalledWith(
        'clhp000000000000000000001',
        updateDto,
      );
    });

    it('should throw if project not found', async () => {
      mockProjectsService.update.mockRejectedValue(
        new Error('Project not found'),
      );

      await expect(
        controller.update('clhp000000000000000000001', {} as UpdateProjectDto),
      ).rejects.toThrow('Project not found');
    });

    it('should throw if project name already exists', async () => {
      mockProjectsService.update.mockRejectedValue(
        new Error('Project already exists'),
      );

      await expect(
        controller.update('clhp000000000000000000001', {
          name: 'Duplicate Project',
        } as UpdateProjectDto),
      ).rejects.toThrow('Project already exists');
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      mockProjectsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('clhp000000000000000000001');

      expect(result).toBeUndefined();
      expect(mockProjectsService.remove).toHaveBeenCalledTimes(1);
      expect(mockProjectsService.remove).toHaveBeenCalledWith(
        'clhp000000000000000000001',
      );
    });

    it('should throw if project not found', async () => {
      mockProjectsService.remove.mockRejectedValue(
        new Error('Project not found'),
      );

      await expect(
        controller.remove('clhp000000000000000000001'),
      ).rejects.toThrow('Project not found');
    });
  });
});
