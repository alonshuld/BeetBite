import { Test, TestingModule } from '@nestjs/testing';
import { SubcontractorsService } from './subcontractors.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { Prisma } from '../generated/client';
import { SubcontractorExistsError } from './errors/subcontractor-exists.error';
import { CreateSubcontractorDto } from './dto/create-subcontractor.dto';
import { PaginationQueryDto } from 'src/common/pagination-query.dto';
import { SubcontractorNotFoundError } from './errors/subcontractor-not-found';

describe('SubcontractorsService', () => {
  let service: SubcontractorsService;

  const mockPrismaService = {
    subcontractor: {
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
        SubcontractorsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SubcontractorsService>(SubcontractorsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateSubcontractorDto = { name: 'Test Subcontractor' };
    const mockSubcontractor = {
      id: '1',
      name: 'Test Subcontractor',
    };

    it('should create a subcontractor', async () => {
      mockPrismaService.subcontractor.create.mockResolvedValue(
        mockSubcontractor,
      );

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: mockSubcontractor.id,
        name: mockSubcontractor.name,
      });
      expect(mockPrismaService.subcontractor.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw SubcontractorExistsError on duplicate name', async () => {
      mockPrismaService.subcontractor.create.mockResolvedValue(createDto);

      const error = new SubcontractorExistsError(createDto.name);
      mockPrismaService.subcontractor.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        SubcontractorExistsError,
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of subcontractors', async () => {
      const mockSubcontractors = [
        {
          id: '1',
          name: 'Subcontractor 1',
        },
        {
          id: '2',
          name: 'Subcontractor 2',
        },
      ];
      mockPrismaService.subcontractor.findMany.mockResolvedValue(
        mockSubcontractors,
      );

      const result = await service.findAll();

      expect(result).toEqual([
        { id: '1', name: 'Subcontractor 1' },
        { id: '2', name: 'Subcontractor 2' },
      ]);
      expect(mockPrismaService.subcontractor.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });

    it('should apply pagination parameters', async () => {
      const mockSubcontractors = [
        {
          id: '3',
          name: 'Subcontractor 3',
        },
      ];
      mockPrismaService.subcontractor.findMany.mockResolvedValue(
        mockSubcontractors,
      );

      const result = await service.findAll({
        page: 2,
        limit: 1,
      } as PaginationQueryDto);

      expect(result).toEqual([{ id: '3', name: 'Subcontractor 3' }]);
      expect(mockPrismaService.subcontractor.findMany).toHaveBeenCalledWith({
        skip: 1,
        take: 1,
      } as PaginationQueryDto);
    });
  });

  describe('findOne', () => {
    it('should return a subcontractor', async () => {
      const mockSubcontractor = {
        id: '1',
        name: 'Test Subcontractor',
      };

      mockPrismaService.subcontractor.findUnique.mockResolvedValue(
        mockSubcontractor,
      );

      const result = await service.findOne('1');

      expect(result).toEqual({
        id: mockSubcontractor.id,
        name: mockSubcontractor.name,
      });
    });

    it('should throw SubcontractorNotFoundError when subcontractor does not exist', async () => {
      mockPrismaService.subcontractor.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        SubcontractorNotFoundError,
      );
    });
  });

  describe('update', () => {
    const updateDto: CreateSubcontractorDto = { name: 'Updated Subcontractor' };

    it('should update a subcontractor', async () => {
      const mockSubcontractor = {
        id: '1',
        name: 'Updated Subcontractor',
      };

      mockPrismaService.subcontractor.update.mockResolvedValue(
        mockSubcontractor,
      );

      const result = await service.update('1', updateDto);

      expect(result).toEqual({
        id: mockSubcontractor.id,
        name: mockSubcontractor.name,
      });
      expect(mockPrismaService.subcontractor.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
    });

    it('should throw SubcontractorNotFoundError when subcontractor does not exist', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });
      mockPrismaService.subcontractor.update.mockRejectedValue(error);

      await expect(service.update('1', updateDto)).rejects.toThrow(
        SubcontractorNotFoundError,
      );
    });
  });

  describe('remove', () => {
    const mockSubcontractor = {
      id: '1',
      name: 'Test Subcontractor',
    };

    it('should delete a subcontractor', async () => {
      mockPrismaService.subcontractor.delete.mockResolvedValue(
        mockSubcontractor,
      );

      const result = await service.remove('1');

      expect(result).toBeUndefined();
    });

    it('should throw SubcontractorNotFoundError when subcontractor does not exist', async () => {
      const subcontractorId = '1';
      const error = new SubcontractorNotFoundError(subcontractorId);
      mockPrismaService.subcontractor.delete.mockRejectedValue(error);

      await expect(service.remove('1')).rejects.toThrow(
        SubcontractorNotFoundError,
      );
    });
  });
});
