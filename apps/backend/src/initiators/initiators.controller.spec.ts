import { Test, TestingModule } from '@nestjs/testing';
import { InitiatorsController } from './initiators.controller';
import { InitiatorsService } from './initiators.service';
import { CreateInitiatorDto } from './dto/create-initiator.dto';
import { UpdateInitiatorDto } from './dto/update-initiator.dto';
import { InitiatorResponseDto } from './dto/initiator-response.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { InitiatorAlreadyExistsError } from './errors/initiator-already-exists.error';
import { InitiatorNotFoundError } from './errors/initiator-not-found.error';

describe('InitiatorsController', () => {
  let controller: InitiatorsController;

  const mockInitiatorsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InitiatorsController],
      providers: [
        {
          provide: InitiatorsService,
          useValue: mockInitiatorsService,
        },
      ],
    }).compile();

    controller = module.get<InitiatorsController>(InitiatorsController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an initiator', async () => {
      const createDto: CreateInitiatorDto = { name: 'Yaniv Goldman' };
      const expectedResult: InitiatorResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Yaniv Goldman',
      };

      mockInitiatorsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockInitiatorsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw if initiator name already exists', async () => {
      const createDto: CreateInitiatorDto = { name: 'Duplicate' };

      mockInitiatorsService.create.mockRejectedValue(
        new InitiatorAlreadyExistsError(createDto.name),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        InitiatorAlreadyExistsError,
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of initiators', async () => {
      const expectedResult: InitiatorResponseDto[] = [
        { id: 'clh0000000000000000000001', name: 'Initiator 1' },
        { id: 'clh0000000000000000000002', name: 'Initiator 2' },
      ];

      mockInitiatorsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockInitiatorsService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should forward pagination params to the service', async () => {
      const expectedResult: InitiatorResponseDto[] = [
        { id: 'clh0000000000000000000001', name: 'Initiator 1' },
      ];
      mockInitiatorsService.findAll.mockResolvedValue(expectedResult);

      const pagination = { page: 2, limit: 10 } as PaginationQueryDto;
      const result = await controller.findAll(pagination);

      expect(result).toEqual(expectedResult);
      expect(mockInitiatorsService.findAll).toHaveBeenCalledWith(pagination);
    });

    it('should return an empty array when no initiators exist', async () => {
      mockInitiatorsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single initiator', async () => {
      const expectedResult: InitiatorResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Initiator 1',
      };

      mockInitiatorsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('clh0000000000000000000001');

      expect(result).toEqual(expectedResult);
      expect(mockInitiatorsService.findOne).toHaveBeenCalledWith(
        'clh0000000000000000000001',
      );
    });

    it('should throw if initiator not found', async () => {
      mockInitiatorsService.findOne.mockRejectedValue(
        new InitiatorNotFoundError('clh0000000000000000000001'),
      );

      await expect(
        controller.findOne('clh0000000000000000000001'),
      ).rejects.toThrow(InitiatorNotFoundError);
    });
  });

  describe('update', () => {
    it('should update an initiator', async () => {
      const updateDto: UpdateInitiatorDto = { name: 'Updated Name' };
      const expectedResult: InitiatorResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Updated Name',
      };

      mockInitiatorsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        'clh0000000000000000000001',
        updateDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockInitiatorsService.update).toHaveBeenCalledWith(
        'clh0000000000000000000001',
        updateDto,
      );
    });

    it('should throw if initiator not found', async () => {
      mockInitiatorsService.update.mockRejectedValue(
        new InitiatorNotFoundError('clh0000000000000000000001'),
      );

      await expect(
        controller.update('clh0000000000000000000001', { name: 'X' }),
      ).rejects.toThrow(InitiatorNotFoundError);
    });

    it('should throw if initiator name already exists', async () => {
      const updateDto: UpdateInitiatorDto = { name: 'Existing' };

      mockInitiatorsService.update.mockRejectedValue(
        new InitiatorAlreadyExistsError(updateDto.name),
      );

      await expect(
        controller.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(InitiatorAlreadyExistsError);
    });
  });

  describe('remove', () => {
    it('should delete an initiator', async () => {
      mockInitiatorsService.remove.mockResolvedValue(undefined);
      const result = await controller.remove('clh0000000000000000000001');

      expect(result).toBeUndefined();
      expect(mockInitiatorsService.remove).toHaveBeenCalledWith(
        'clh0000000000000000000001',
      );
    });

    it('should throw if initiator not found', async () => {
      mockInitiatorsService.remove.mockRejectedValue(
        new InitiatorNotFoundError('clh0000000000000000000001'),
      );

      await expect(
        controller.remove('clh0000000000000000000001'),
      ).rejects.toThrow(InitiatorNotFoundError);
    });
  });
});
