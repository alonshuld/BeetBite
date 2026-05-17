import { Test, TestingModule } from '@nestjs/testing';
import { CorporationsController } from './corporations.controller';
import { CorporationsService } from './corporations.service';
import { CreateCorporationDto } from './dto/create-corporation.dto';
import { UpdateCorporationDto } from './dto/update-corporation.dto';
import { CorporationResponseDto } from './dto/corporation-response.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { CorporationAlreadyExistsError } from './errors/corporation-already-exists.error';
import { CorporationNotFoundError } from './errors/corporation-not-found.error';

describe('CorporationsController', () => {
  let controller: CorporationsController;

  const mockCorporationsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CorporationsController],
      providers: [
        {
          provide: CorporationsService,
          useValue: mockCorporationsService,
        },
      ],
    }).compile();

    controller = module.get<CorporationsController>(CorporationsController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a corporation', async () => {
      const createDto: CreateCorporationDto = { name: 'Test Corp' };
      const expectedResult: CorporationResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Test Corp',
      };

      mockCorporationsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockCorporationsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw if corporation name already exists', async () => {
      const createDto: CreateCorporationDto = { name: 'Duplicate Corp' };

      mockCorporationsService.create.mockRejectedValue(
        new CorporationAlreadyExistsError(createDto.name),
      );

      await expect(
        controller.create({ name: 'Duplicate Corp' }),
      ).rejects.toThrow(CorporationAlreadyExistsError);
    });

    it('should throw if corporation name is invalid', async () => {
      mockCorporationsService.create.mockRejectedValue(
        new Error('Invalid name'),
      );

      await expect(controller.create({ name: '' })).rejects.toThrow(Error);
    });
  });

  describe('findAll', () => {
    it('should return a list of corporations', async () => {
      const expectedResult: CorporationResponseDto[] = [
        { id: 'clh0000000000000000000001', name: 'Corp 1' },
        { id: 'clh0000000000000000000002', name: 'Corp 2' },
      ];

      mockCorporationsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockCorporationsService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should forward pagination params to the service', async () => {
      const expectedResult: CorporationResponseDto[] = [
        { id: 'clh0000000000000000000001', name: 'Corp 1' },
        { id: 'clh0000000000000000000002', name: 'Corp 2' },
      ];

      mockCorporationsService.findAll.mockResolvedValue(expectedResult);

      const pagination = { page: 2, limit: 10 } as PaginationQueryDto;

      const result = await controller.findAll(pagination);

      expect(result).toEqual(expectedResult);
      expect(mockCorporationsService.findAll).toHaveBeenCalledWith(pagination);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Service failure');
      mockCorporationsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow(Error);
    });

    it('should return an empty array when no corporations exist', async () => {
      mockCorporationsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(mockCorporationsService.findAll).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a corporation', async () => {
      const updateDto: UpdateCorporationDto = { name: 'Updated Corp' };
      const expectedResult: CorporationResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Updated Corp',
      };

      mockCorporationsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        'clh0000000000000000000001',
        updateDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockCorporationsService.update).toHaveBeenCalledWith(
        'clh0000000000000000000001',
        updateDto,
      );
    });

    it('should throw if corporation not found', async () => {
      mockCorporationsService.update.mockRejectedValue(
        new CorporationNotFoundError('clh0000000000000000000001'),
      );

      await expect(
        controller.update('clh0000000000000000000001', {
          name: 'Updated Corp',
        }),
      ).rejects.toThrow(CorporationNotFoundError);
    });

    it('should throw if corporation name is invalid', async () => {
      mockCorporationsService.update.mockRejectedValue(
        new Error('Invalid name'),
      );

      await expect(
        controller.update('clh0000000000000000000001', { name: '' }),
      ).rejects.toThrow(Error);
    });

    it('should throw if corporation name already exists', async () => {
      const updateDto: UpdateCorporationDto = { name: 'Existing Corp' };

      mockCorporationsService.update.mockRejectedValue(
        new CorporationAlreadyExistsError(updateDto.name),
      );

      await expect(
        controller.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(CorporationAlreadyExistsError);
    });
  });

  describe('findOne', () => {
    it('should return a single corporation', async () => {
      const expectedResult: CorporationResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Corp 1',
      };

      mockCorporationsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('clh0000000000000000000001');

      expect(result).toEqual(expectedResult);
      expect(mockCorporationsService.findOne).toHaveBeenCalledWith(
        'clh0000000000000000000001',
      );
    });

    it('should throw if corporation not found', async () => {
      mockCorporationsService.findOne.mockRejectedValue(
        new CorporationNotFoundError('clh0000000000000000000001'),
      );

      await expect(
        controller.findOne('clh0000000000000000000001'),
      ).rejects.toThrow(CorporationNotFoundError);
    });
  });

  describe('remove', () => {
    it('should delete a corporation', async () => {
      mockCorporationsService.remove.mockResolvedValue(undefined);
      const result = await controller.remove('clh0000000000000000000001');

      expect(result).toBeUndefined();
      expect(mockCorporationsService.remove).toHaveBeenCalledTimes(1);
      expect(mockCorporationsService.remove).toHaveBeenCalledWith(
        'clh0000000000000000000001',
      );
    });

    it('should throw if corporation not found', async () => {
      const corporationId = 'clh0000000000000000000001';

      mockCorporationsService.remove.mockRejectedValue(
        new CorporationNotFoundError(corporationId),
      );

      await expect(
        controller.remove('clh0000000000000000000001'),
      ).rejects.toThrow(CorporationNotFoundError);
    });
  });
});
