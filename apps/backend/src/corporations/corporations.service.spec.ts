import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CorporationsService } from './corporations.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCorporationDto } from './dto/create-corporation.dto';
import { UpdateCorporationDto } from './dto/update-corporation.dto';
import { Prisma } from '../generated/client';
import { PRISMA_ERROR_CODES } from '../common/constants';

describe('CorporationsService', () => {
  let service: CorporationsService;

  const mockPrismaService = {
    corporation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CorporationsService>(CorporationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCorporationDto = { name: 'Test Corp' };
    const mockCorporation = {
      id: '1',
      name: 'Test Corp',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a corporation', async () => {
      mockPrismaService.corporation.create.mockResolvedValue(mockCorporation);

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: mockCorporation.id,
        name: mockCorporation.name,
      });
      expect(mockPrismaService.corporation.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw ConflictException on duplicate name', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });
      mockPrismaService.corporation.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of corporations', async () => {
      const mockCorporations = [
        {
          id: '1',
          name: 'Corp 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Corp 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.corporation.findMany.mockResolvedValue(
        mockCorporations,
      );

      const result = await service.findAll();

      expect(result).toEqual([
        { id: '1', name: 'Corp 1' },
        { id: '2', name: 'Corp 2' },
      ]);
      expect(mockPrismaService.corporation.findMany).toHaveBeenCalledWith();
    });
  });

  describe('findOne', () => {
    const mockCorporation = {
      id: '1',
      name: 'Test Corp',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return a corporation', async () => {
      mockPrismaService.corporation.findUnique.mockResolvedValue(
        mockCorporation,
      );

      const result = await service.findOne('1');

      expect(result).toEqual({
        id: mockCorporation.id,
        name: mockCorporation.name,
      });
    });

    it('should throw NotFoundException when corporation not found', async () => {
      mockPrismaService.corporation.findUnique.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCorporationDto = { name: 'Updated Corp' };
    const mockCorporation = {
      id: '1',
      name: 'Updated Corp',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update a corporation', async () => {
      mockPrismaService.corporation.update.mockResolvedValue(mockCorporation);

      const result = await service.update('1', updateDto);

      expect(result).toEqual({
        id: mockCorporation.id,
        name: mockCorporation.name,
      });
    });

    it('should throw NotFoundException when corporation not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });
      mockPrismaService.corporation.update.mockRejectedValue(error);

      await expect(service.update('1', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    const mockCorporation = {
      id: '1',
      name: 'Test Corp',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should delete a corporation', async () => {
      mockPrismaService.corporation.delete.mockResolvedValue(mockCorporation);

      const result = await service.remove('1');

      expect(result).toEqual({
        id: mockCorporation.id,
        name: mockCorporation.name,
      });
    });

    it('should throw NotFoundException when corporation not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });
      mockPrismaService.corporation.delete.mockRejectedValue(error);

      await expect(service.remove('1')).rejects.toThrow(NotFoundException);
    });
  });
});
