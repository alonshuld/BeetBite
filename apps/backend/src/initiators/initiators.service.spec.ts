import { Test, TestingModule } from '@nestjs/testing';
import { InitiatorsService } from './initiators.service';
import { CreateInitiatorDto } from './dto/create-initiator.dto';
import { UpdateInitiatorDto } from './dto/update-initiator.dto';
import { Prisma } from '../generated/client';
import { PRISMA_ERROR_CODES } from '../common/constants';
import { InitiatorAlreadyExistsError } from './errors/initiator-already-exists.error';
import { InitiatorNotFoundError } from './errors/initiator-not-found.error';
import { PrismaService } from 'src/prisma/prisma.service';

describe('InitiatorsService', () => {
  let service: InitiatorsService;

  const mockPrismaService = {
    initiator: {
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
        InitiatorsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InitiatorsService>(InitiatorsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateInitiatorDto = { name: 'Yaniv Goldman' };

    it('should create an initiator', async () => {
      const mockInitiator = {
        id: 'clh0000000000000000000001',
        name: 'Yaniv Goldman',
      };

      mockPrismaService.initiator.create.mockResolvedValue(mockInitiator);

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: mockInitiator.id,
        name: mockInitiator.name,
      });
      expect(mockPrismaService.initiator.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw InitiatorAlreadyExistsError on duplicate name', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });
      mockPrismaService.initiator.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        InitiatorAlreadyExistsError,
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of initiators', async () => {
      const mockInitiators = [
        { id: 'clh0000000000000000000001', name: 'Initiator 1' },
        { id: 'clh0000000000000000000002', name: 'Initiator 2' },
      ];
      mockPrismaService.initiator.findMany.mockResolvedValue(mockInitiators);

      const result = await service.findAll();

      expect(result).toEqual(mockInitiators);
      expect(mockPrismaService.initiator.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });

    it('should apply pagination params when provided', async () => {
      const mockInitiators = [
        { id: 'clh0000000000000000000003', name: 'Initiator 3' },
      ];

      mockPrismaService.initiator.findMany.mockResolvedValue(mockInitiators);

      const result = await service.findAll({ page: 2, limit: 1 });

      expect(result).toEqual(mockInitiators);
      expect(mockPrismaService.initiator.findMany).toHaveBeenCalledWith({
        skip: 1,
        take: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return an initiator', async () => {
      const mockInitiator = {
        id: 'clh0000000000000000000001',
        name: 'Yaniv Goldman',
      };

      mockPrismaService.initiator.findUnique.mockResolvedValue(mockInitiator);

      const result = await service.findOne('clh0000000000000000000001');

      expect(result).toEqual(mockInitiator);
    });

    it('should throw InitiatorNotFoundError when initiator not found', async () => {
      mockPrismaService.initiator.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('clh0000000000000000000001'),
      ).rejects.toThrow(InitiatorNotFoundError);
    });
  });

  describe('update', () => {
    const updateDto: UpdateInitiatorDto = { name: 'Updated Name' };

    it('should update an initiator', async () => {
      const mockInitiator = {
        id: 'clh0000000000000000000001',
        name: 'Updated Name',
      };

      mockPrismaService.initiator.update.mockResolvedValue(mockInitiator);

      const result = await service.update(
        'clh0000000000000000000001',
        updateDto,
      );

      expect(result).toEqual(mockInitiator);
      expect(mockPrismaService.initiator.update).toHaveBeenCalledWith({
        where: { id: 'clh0000000000000000000001' },
        data: updateDto,
      });
    });

    it('should throw InitiatorNotFoundError when initiator not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });
      mockPrismaService.initiator.update.mockRejectedValue(error);

      await expect(
        service.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(InitiatorNotFoundError);
    });

    it('should throw InitiatorAlreadyExistsError on duplicate name (P2002)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });
      mockPrismaService.initiator.update.mockRejectedValue(error);

      await expect(
        service.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(InitiatorAlreadyExistsError);
    });
  });

  describe('remove', () => {
    it('should delete an initiator', async () => {
      mockPrismaService.initiator.delete.mockResolvedValue({
        id: 'clh0000000000000000000001',
        name: 'Yaniv Goldman',
      });

      const result = await service.remove('clh0000000000000000000001');

      expect(result).toBeUndefined();
    });

    it('should throw InitiatorNotFoundError when initiator not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });
      mockPrismaService.initiator.delete.mockRejectedValue(error);

      await expect(service.remove('clh0000000000000000000001')).rejects.toThrow(
        InitiatorNotFoundError,
      );
    });
  });
});
