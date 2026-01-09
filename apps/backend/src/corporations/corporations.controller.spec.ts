import { Test, TestingModule } from '@nestjs/testing';
import { CorporationsController } from './corporations.controller';
import { CorporationsService } from './corporations.service';
import { CreateCorporationDto } from './dto/create-corporation.dto';
import { UpdateCorporationDto } from './dto/update-corporation.dto';
import { CorporationResponseDto } from './dto/corporation-response.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';

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
        id: '1',
        name: 'Test Corp',
      };

      mockCorporationsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockCorporationsService.create).toHaveBeenCalledWith(createDto);
    });
    it('should pass an empty DTO to the service', async () => {
      const createDto = {} as CreateCorporationDto;

      mockCorporationsService.create.mockResolvedValue({
        id: '1',
        name: '',
      });

      await controller.create(createDto);

      expect(mockCorporationsService.create).toHaveBeenCalledWith(createDto);
    });
    it('should throw if corporation name already exists', async () => {
      mockCorporationsService.create.mockRejectedValue(
        new Error('Corporation already exists'),
      );

      await expect(
        controller.create({ name: 'Duplicate Corp' }),
      ).rejects.toThrow('Corporation already exists');
    });
    it('should throw if corporation name is invalid', async () => {
      mockCorporationsService.create.mockRejectedValue(
        new Error('Invalid name'),
      );

      await expect(controller.create({ name: '' })).rejects.toThrow(
        'Invalid name',
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of corporations', async () => {
      const expectedResult: CorporationResponseDto[] = [
        { id: '1', name: 'Corp 1' },
        { id: '2', name: 'Corp 2' },
      ];

      mockCorporationsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockCorporationsService.findAll).toHaveBeenCalledWith(undefined);
    });
    it('should forward pagination params to the service', async () => {
      const expectedResult: CorporationResponseDto[] = [
        { id: '3', name: 'Corp 3' },
      ];

      mockCorporationsService.findAll.mockResolvedValue(expectedResult);

      const pagination = { page: 2, limit: 1 } as PaginationQueryDto;

      const result = await controller.findAll(pagination);

      expect(result).toEqual(expectedResult);
      expect(mockCorporationsService.findAll).toHaveBeenCalledWith(pagination);
    });
    it('should propagate errors from the service', async () => {
      const error = new Error('Service failure');
      mockCorporationsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow('Service failure');
    });
    it('should return an empty array when no corporations exist', async () => {
      mockCorporationsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update a corporation', async () => {
      const updateDto: UpdateCorporationDto = { name: 'Updated Corp' };
      const expectedResult: CorporationResponseDto = {
        id: '1',
        name: 'Updated Corp',
      };

      mockCorporationsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(expectedResult);
      expect(mockCorporationsService.update).toHaveBeenCalledWith(
        '1',
        updateDto,
      );
    });
    it('should throw if corporation not found', async () => {
      mockCorporationsService.update.mockRejectedValue(
        new Error('Corporation not found'),
      );

      await expect(
        controller.update('1', { name: 'Updated Corp' }),
      ).rejects.toThrow('Corporation not found');
    });
    it('should throw if corporation name is invalid', async () => {
      mockCorporationsService.update.mockRejectedValue(
        new Error('Invalid name'),
      );

      await expect(controller.update('1', { name: '' })).rejects.toThrow(
        'Invalid name',
      );
    });
    it('should throw if corporation name already exists', async () => {
      mockCorporationsService.update.mockRejectedValue(
        new Error('Corporation with this name already exists'),
      );

      await expect(
        controller.update('1', { name: 'Duplicate Corp' }),
      ).rejects.toThrow('Corporation with this name already exists');
    });
  });

  describe('findOne', () => {
    it('should return a single corporation', async () => {
      const expectedResult: CorporationResponseDto = {
        id: '1',
        name: 'Corp 1',
      };

      mockCorporationsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('1');

      expect(result).toEqual(expectedResult);
      expect(mockCorporationsService.findOne).toHaveBeenCalledWith('1');
    });

    describe('remove', () => {
      it('should delete a corporation', async () => {
        mockCorporationsService.remove.mockResolvedValue(undefined);

        const result = await controller.remove('1');

        expect(result).toBeUndefined();
        expect(mockCorporationsService.remove).toHaveBeenCalledTimes(1);
        expect(mockCorporationsService.remove).toHaveBeenCalledWith('1');
      });

      it('should throw if corporation not found', async () => {
        mockCorporationsService.remove.mockRejectedValue(
          new Error('Corporation not found'),
        );

        await expect(controller.remove('1')).rejects.toThrow(
          'Corporation not found',
        );
      });

      it('should throw if corporation name is invalid', async () => {
        mockCorporationsService.remove.mockRejectedValue(
          new Error('Invalid name'),
        );

        await expect(controller.remove('1')).rejects.toThrow('Invalid name');
      });
    });
  });
});
