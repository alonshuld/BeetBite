import { Test, TestingModule } from '@nestjs/testing';
import { SubcontractorsController } from './subcontractors.controller';
import { SubcontractorsService } from './subcontractors.service';
import { CreateSubcontractorDto } from './dto/create-subcontractor.dto';
import { SubcontractorResponseDto } from './dto/subcontractor-repsonse.dto';
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
      const createDto: CreateSubcontractorDto = { name: 'Test Subcontractor' };
      const expectedResult: SubcontractorResponseDto = {
        id: '1',
        name: 'Test Subcontractor',
      };

      mockSubcontractorService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockSubcontractorService.create).toHaveBeenCalledWith(createDto);
    });
    it('should throw if subcontractor name already exists', async () => {
      const createDto: CreateSubcontractorDto = {
        name: 'Duplicate Subcontractor',
      };

      mockSubcontractorService.create.mockRejectedValue(
        new SubcontractorAlreadyExistsError(createDto.name),
      );

      await expect(
        controller.create({ name: 'Duplicate Subcontractor' }),
      ).rejects.toThrow(SubcontractorAlreadyExistsError);
    });
    it('should throw if subcontractor name is invalid', async () => {
      mockSubcontractorService.create.mockRejectedValue(
        new Error('Invalid name'),
      );

      await expect(controller.create({ name: '' })).rejects.toThrow(Error);
    });
  });

  describe('findAll', () => {
    it('should return all subcontractors', async () => {
      const expectedResult: SubcontractorResponseDto[] = [
        { id: '1', name: 'Subcontractor 1' },
        { id: '2', name: 'Subcontractor 2' },
      ];

      mockSubcontractorService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockSubcontractorService.findAll).toHaveBeenCalled();
    });

    it('should forward pagination parameters', async () => {
      const expectedResult: SubcontractorResponseDto[] = [
        { id: '1', name: 'Subcontractor 1' },
        { id: '2', name: 'Subcontractor 2' },
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
      const updateDto = { name: 'Updated Subcontractor' };
      const expectedResult: SubcontractorResponseDto = {
        id: '1',
        name: 'Updated Subcontractor',
      };

      mockSubcontractorService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(expectedResult);
      expect(mockSubcontractorService.update).toHaveBeenCalledWith(
        '1',
        updateDto,
      );
    });

    it('should throw if subcontractor not found', async () => {
      const updateDto = { name: 'Nonexistent Subcontractor' };

      mockSubcontractorService.update.mockRejectedValue(
        new SubcontractorNotFoundError('1'),
      );

      await expect(controller.update('1', updateDto)).rejects.toThrow(
        SubcontractorNotFoundError,
      );
    });

    it('should throw if subcontractor name is invalid', async () => {
      const updateDto = { name: '' };

      mockSubcontractorService.update.mockRejectedValue(
        new Error('Invalid name'),
      );

      await expect(controller.update('1', updateDto)).rejects.toThrow(Error);
    });

    it('should throw if subcontractor name already exists', async () => {
      const updateDto = { name: 'Existing Subcontractor' };

      mockSubcontractorService.update.mockRejectedValue(
        new SubcontractorAlreadyExistsError(updateDto.name),
      );

      await expect(controller.update('1', updateDto)).rejects.toThrow(
        SubcontractorAlreadyExistsError,
      );
    });
  });

  describe('findOne', () => {
    it('should return a single subcontractor', async () => {
      const expectedResult: SubcontractorResponseDto = {
        id: '1',
        name: 'Subcontractor 1',
      };

      mockSubcontractorService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('1');

      expect(result).toEqual(expectedResult);
      expect(mockSubcontractorService.findOne).toHaveBeenCalledWith('1');
    });

    it('should throw if subcontractor not found', async () => {
      mockSubcontractorService.findOne.mockRejectedValue(
        new SubcontractorNotFoundError('1'),
      );

      await expect(controller.findOne('1')).rejects.toThrow(
        SubcontractorNotFoundError,
      );
    });
  });

  describe('remove', () => {
    it('should delete a subcontractor', async () => {
      mockSubcontractorService.remove.mockResolvedValue(undefined);
      const result = await controller.remove('1');

      expect(result).toBeUndefined();
      expect(mockSubcontractorService.remove).toHaveBeenCalledTimes(1);
      expect(mockSubcontractorService.remove).toHaveBeenCalledWith('1');
    });

    it('should throw if subcontractor not found', async () => {
      const subcontractorId = '1';

      mockSubcontractorService.remove.mockRejectedValue(
        new SubcontractorNotFoundError(subcontractorId),
      );

      await expect(controller.remove(subcontractorId)).rejects.toThrow(
        SubcontractorNotFoundError,
      );
    });
  });
});
