import { Test, TestingModule } from '@nestjs/testing';
import { CorporationsService } from './corporations.service';
import { CreateCorporationDto } from './dto/create-corporation.dto';
import { UpdateCorporationDto } from './dto/update-corporation.dto';
import { Prisma } from '../generated/client';
import { PRISMA_ERROR_CODES } from '../common/constants';
import { CorporationAlreadyExistsError } from './errors/corporation-already-exists.error';
import { CorporationNotFoundError } from './errors/corporation-not-found.error';
import { EntityHasRelatedRecordsError } from 'src/common/errors/entity-has-related-records.error';
import { PrismaService } from 'src/prisma/prisma.service';

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

    it('should create a corporation', async () => {
      const mockCorporation = {
        id: 'clh0000000000000000000001',
        name: 'Test Corp',
      };

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

    it('should throw CorporationExistsError on duplicate name', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });
      mockPrismaService.corporation.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        CorporationAlreadyExistsError,
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of corporations', async () => {
      const mockCorporations = [
        {
          id: 'clh0000000000000000000001',
          name: 'Corp 1',
        },
        {
          id: 'clh0000000000000000000002',
          name: 'Corp 2',
        },
      ];
      mockPrismaService.corporation.findMany.mockResolvedValue(
        mockCorporations,
      );

      const result = await service.findAll();

      expect(result).toEqual([
        { id: 'clh0000000000000000000001', name: 'Corp 1' },
        { id: 'clh0000000000000000000002', name: 'Corp 2' },
      ]);
      expect(mockPrismaService.corporation.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });

    it('should apply pagination params when provided', async () => {
      const mockCorporations = [
        {
          id: 'clh0000000000000000000003',
          name: 'Corp 3',
        },
      ];

      mockPrismaService.corporation.findMany.mockResolvedValue(
        mockCorporations,
      );

      const result = await service.findAll({
        page: 2,
        limit: 1,
      });

      expect(result).toEqual([
        { id: 'clh0000000000000000000003', name: 'Corp 3' },
      ]);
      expect(mockPrismaService.corporation.findMany).toHaveBeenCalledWith({
        skip: 1,
        take: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return a corporation', async () => {
      const mockCorporation = {
        id: 'clh0000000000000000000001',
        name: 'Test Corp',
      };

      mockPrismaService.corporation.findUnique.mockResolvedValue(
        mockCorporation,
      );

      const result = await service.findOne('clh0000000000000000000001');

      expect(result).toEqual({
        id: mockCorporation.id,
        name: mockCorporation.name,
      });
    });

    it('should throw CorporationNotFoundError when corporation not found', async () => {
      mockPrismaService.corporation.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('clh0000000000000000000001'),
      ).rejects.toThrow(CorporationNotFoundError);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCorporationDto = { name: 'Updated Corp' };

    it('should update a corporation', async () => {
      const mockCorporation = {
        id: 'clh0000000000000000000001',
        name: 'Updated Corp',
      };

      mockPrismaService.corporation.update.mockResolvedValue(mockCorporation);

      const result = await service.update(
        'clh0000000000000000000001',
        updateDto,
      );

      expect(result).toEqual({
        id: mockCorporation.id,
        name: mockCorporation.name,
      });
      expect(mockPrismaService.corporation.update).toHaveBeenCalledWith({
        where: { id: 'clh0000000000000000000001' },
        data: updateDto,
      });
    });

    it('should throw CorporationNotFoundError when corporation not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });
      mockPrismaService.corporation.update.mockRejectedValue(error);

      await expect(
        service.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(CorporationNotFoundError);
    });

    it('should throw CorporationAlreadyExistsError on duplicate name (P2002)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });
      mockPrismaService.corporation.update.mockRejectedValue(error);

      await expect(
        service.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(CorporationAlreadyExistsError);
    });
  });

  describe('remove', () => {
    const mockCorporation = {
      id: 'clh0000000000000000000001',
      name: 'Test Corp',
    };

    it('should delete a corporation', async () => {
      mockPrismaService.corporation.delete.mockResolvedValue(mockCorporation);

      const result = await service.remove('clh0000000000000000000001');

      expect(result).toBeUndefined();
    });

    it('should throw CorporationNotFoundError when corporation not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });
      mockPrismaService.corporation.delete.mockRejectedValue(error);

      await expect(service.remove('clh0000000000000000000001')).rejects.toThrow(
        CorporationNotFoundError,
      );
    });

    it('should throw EntityHasRelatedRecordsError when corporation has related payments (P2003)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });
      mockPrismaService.corporation.delete.mockRejectedValue(error);

      await expect(service.remove('clh0000000000000000000001')).rejects.toThrow(
        EntityHasRelatedRecordsError,
      );
    });
  });
});
