import { Test, TestingModule } from '@nestjs/testing';
import { SubcontractorsController } from './subcontractors.controller';
import { SubcontractorsService } from './subcontractors.service';
import { CreateSubcontractorDto } from './dto/create-subcontractor.dto';
import { SubcontractorResponseDto } from './dto/subcontractor-response.dto';
import { SubcontractorAlreadyExistsError } from './errors/subcontractor-already-exists.error';
import { SubcontractorNotFoundError } from './errors/subcontractor-not-found';

describe('SubcontractorsController', () => {
  let controller: SubcontractorsController;

  const mockSubcontractorService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubcontractorsController],
      providers: [
        {
          provide: SubcontractorsService,
          useValue: mockSubcontractorService,
        },
      ],
    }).compile();

    controller = module.get<SubcontractorsController>(SubcontractorsController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a subcontractor', async () => {
      const createDto: CreateSubcontractorDto = {
        name: 'Test Subcontractor',
        companyNumber: '515123456',
      };
      const expectedResult: SubcontractorResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Test Subcontractor',
        companyNumber: '515123456',
        teamId: null,
      };

      mockSubcontractorService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockSubcontractorService.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw if subcontractor name already exists', async () => {
      const createDto: CreateSubcontractorDto = {
        name: 'Duplicate Subcontractor',
        companyNumber: '515123456',
      };

      mockSubcontractorService.create.mockRejectedValue(
        new SubcontractorAlreadyExistsError(createDto.name),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        SubcontractorAlreadyExistsError,
      );
    });

    it('should throw if subcontractor company number already exists', async () => {
      const createDto: CreateSubcontractorDto = {
        name: 'Another Subcontractor',
        companyNumber: '515123456',
      };

      mockSubcontractorService.create.mockRejectedValue(
        new SubcontractorAlreadyExistsError(
          createDto.companyNumber,
          'companyNumber',
        ),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        SubcontractorAlreadyExistsError,
      );
    });

    it('should throw if subcontractor name is invalid', async () => {
      mockSubcontractorService.create.mockRejectedValue(
        new Error('Invalid name'),
      );

      await expect(
        controller.create({ name: '', companyNumber: '515123456' }),
      ).rejects.toThrow(Error);
    });
  });

  describe('findAll', () => {
    it('should return all subcontractors', async () => {
      const expectedResult: SubcontractorResponseDto[] = [
        {
          id: 'clh0000000000000000000001',
          name: 'Subcontractor 1',
          companyNumber: '515123456',
          teamId: null,
        },
        {
          id: 'clh0000000000000000000002',
          name: 'Subcontractor 2',
          companyNumber: '515123457',
          teamId: null,
        },
      ];

      mockSubcontractorService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockSubcontractorService.findAll).toHaveBeenCalled();
    });

    it('should forward pagination parameters', async () => {
      const expectedResult: SubcontractorResponseDto[] = [
        {
          id: 'clh0000000000000000000001',
          name: 'Subcontractor 1',
          companyNumber: '515123456',
          teamId: null,
        },
        {
          id: 'clh0000000000000000000002',
          name: 'Subcontractor 2',
          companyNumber: '515123457',
          teamId: null,
        },
      ];

      mockSubcontractorService.findAll.mockResolvedValue(expectedResult);

      const paginationParams = { page: 2, limit: 10 };

      const result = await controller.findAll(paginationParams);

      expect(result).toEqual(expectedResult);
      expect(mockSubcontractorService.findAll).toHaveBeenCalledWith(
        paginationParams,
      );
    });

    it('should propagate errors from the service', async () => {
      mockSubcontractorService.findAll.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(controller.findAll()).rejects.toThrow(Error);
    });

    it('should return an empty array if no subcontractors exist', async () => {
      mockSubcontractorService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(mockSubcontractorService.findAll).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a subcontractor', async () => {
      const updateDto = {
        name: 'Updated Subcontractor',
        companyNumber: '515123456',
      };
      const expectedResult: SubcontractorResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Updated Subcontractor',
        companyNumber: '515123456',
        teamId: null,
      };

      mockSubcontractorService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        'clh0000000000000000000001',
        updateDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockSubcontractorService.update).toHaveBeenCalledWith(
        'clh0000000000000000000001',
        updateDto,
      );
    });

    it('should throw if subcontractor not found', async () => {
      const updateDto = {
        name: 'Nonexistent Subcontractor',
        companyNumber: '515123456',
      };

      mockSubcontractorService.update.mockRejectedValue(
        new SubcontractorNotFoundError('clh0000000000000000000001'),
      );

      await expect(
        controller.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(SubcontractorNotFoundError);
    });

    it('should throw if subcontractor name is invalid', async () => {
      const updateDto = { name: '', companyNumber: '515123456' };

      mockSubcontractorService.update.mockRejectedValue(
        new Error('Invalid name'),
      );

      await expect(
        controller.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(Error);
    });

    it('should throw if subcontractor name already exists', async () => {
      const updateDto = {
        name: 'Existing Subcontractor',
        companyNumber: '515123456',
      };

      mockSubcontractorService.update.mockRejectedValue(
        new SubcontractorAlreadyExistsError(updateDto.name),
      );

      await expect(
        controller.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(SubcontractorAlreadyExistsError);
    });

    it('should throw if subcontractor company number already exists', async () => {
      const updateDto = {
        name: 'Existing Subcontractor',
        companyNumber: '515123456',
      };

      mockSubcontractorService.update.mockRejectedValue(
        new SubcontractorAlreadyExistsError(
          updateDto.companyNumber,
          'companyNumber',
        ),
      );

      await expect(
        controller.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(SubcontractorAlreadyExistsError);
    });
  });

  describe('findOne', () => {
    it('should return a single subcontractor', async () => {
      const expectedResult: SubcontractorResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Subcontractor 1',
        companyNumber: '515123456',
        teamId: null,
      };

      mockSubcontractorService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('clh0000000000000000000001');

      expect(result).toEqual(expectedResult);
      expect(mockSubcontractorService.findOne).toHaveBeenCalledWith(
        'clh0000000000000000000001',
      );
    });

    it('should throw if subcontractor not found', async () => {
      mockSubcontractorService.findOne.mockRejectedValue(
        new SubcontractorNotFoundError('clh0000000000000000000001'),
      );

      await expect(
        controller.findOne('clh0000000000000000000001'),
      ).rejects.toThrow(SubcontractorNotFoundError);
    });
  });

  describe('remove', () => {
    it('should delete a subcontractor', async () => {
      mockSubcontractorService.remove.mockResolvedValue(undefined);
      const result = await controller.remove('clh0000000000000000000001');

      expect(result).toBeUndefined();
      expect(mockSubcontractorService.remove).toHaveBeenCalledTimes(1);
      expect(mockSubcontractorService.remove).toHaveBeenCalledWith(
        'clh0000000000000000000001',
      );
    });

    it('should throw if subcontractor not found', async () => {
      const subcontractorId = 'clh0000000000000000000001';

      mockSubcontractorService.remove.mockRejectedValue(
        new SubcontractorNotFoundError(subcontractorId),
      );

      await expect(controller.remove(subcontractorId)).rejects.toThrow(
        SubcontractorNotFoundError,
      );
    });
  });
});
