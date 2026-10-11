import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Prisma } from '../generated/client';
import { PRISMA_ERROR_CODES } from '../common/constants';
import { SupplierAlreadyExistsError } from './errors/supplier-already-exists.error';
import { SupplierNotFoundError } from './errors/supplier-not-found.error';
import { PrismaService } from 'src/prisma/prisma.service';

describe('SuppliersService', () => {
  let service: SuppliersService;

  const mockPrismaService = {
    supplier: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateSupplierDto = { name: 'Test Corp' };

    it('should create a supplier', async () => {
      const mockSupplier = {
        id: 'clh0000000000000000000001',
        name: 'Test Corp',
      };

      mockPrismaService.supplier.create.mockResolvedValue(mockSupplier);

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: mockSupplier.id,
        name: mockSupplier.name,
      });
      expect(mockPrismaService.supplier.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw SupplierExistsError on duplicate name', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });
      mockPrismaService.supplier.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        SupplierAlreadyExistsError,
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of suppliers', async () => {
      const mockSuppliers = [
        {
          id: 'clh0000000000000000000001',
          name: 'Corp 1',
        },
        {
          id: 'clh0000000000000000000002',
          name: 'Corp 2',
        },
      ];
      mockPrismaService.supplier.findMany.mockResolvedValue(mockSuppliers);

      const result = await service.findAll();

      expect(result).toEqual([
        { id: 'clh0000000000000000000001', name: 'Corp 1' },
        { id: 'clh0000000000000000000002', name: 'Corp 2' },
      ]);
      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });

    it('should apply pagination params when provided', async () => {
      const mockSuppliers = [
        {
          id: 'clh0000000000000000000003',
          name: 'Corp 3',
        },
      ];

      mockPrismaService.supplier.findMany.mockResolvedValue(mockSuppliers);

      const result = await service.findAll({
        page: 2,
        limit: 1,
      });

      expect(result).toEqual([
        { id: 'clh0000000000000000000003', name: 'Corp 3' },
      ]);
      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith({
        skip: 1,
        take: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return a supplier', async () => {
      const mockSupplier = {
        id: 'clh0000000000000000000001',
        name: 'Test Corp',
      };

      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);

      const result = await service.findOne('clh0000000000000000000001');

      expect(result).toEqual({
        id: mockSupplier.id,
        name: mockSupplier.name,
      });
    });

    it('should throw SupplierNotFoundError when supplier not found', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('clh0000000000000000000001'),
      ).rejects.toThrow(SupplierNotFoundError);
    });
  });

  describe('update', () => {
    const updateDto: UpdateSupplierDto = { name: 'Updated Corp' };

    it('should update a supplier', async () => {
      const mockSupplier = {
        id: 'clh0000000000000000000001',
        name: 'Updated Corp',
      };

      mockPrismaService.supplier.update.mockResolvedValue(mockSupplier);

      const result = await service.update(
        'clh0000000000000000000001',
        updateDto,
      );

      expect(result).toEqual({
        id: mockSupplier.id,
        name: mockSupplier.name,
      });
      expect(mockPrismaService.supplier.update).toHaveBeenCalledWith({
        where: { id: 'clh0000000000000000000001' },
        data: updateDto,
      });
    });

    it('should throw SupplierNotFoundError when supplier not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });
      mockPrismaService.supplier.update.mockRejectedValue(error);

      await expect(
        service.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(SupplierNotFoundError);
    });

    it('should throw SupplierAlreadyExistsError on duplicate name (P2002)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });
      mockPrismaService.supplier.update.mockRejectedValue(error);

      await expect(
        service.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(SupplierAlreadyExistsError);
    });
  });

  describe('remove', () => {
    const mockSupplier = {
      id: 'clh0000000000000000000001',
      name: 'Test Corp',
    };

    it('should delete a supplier', async () => {
      mockPrismaService.supplier.delete.mockResolvedValue(mockSupplier);

      const result = await service.remove('clh0000000000000000000001');

      expect(result).toBeUndefined();
    });

    it('should throw SupplierNotFoundError when supplier not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });
      mockPrismaService.supplier.delete.mockRejectedValue(error);

      await expect(service.remove('clh0000000000000000000001')).rejects.toThrow(
        SupplierNotFoundError,
      );
    });
  });
});
