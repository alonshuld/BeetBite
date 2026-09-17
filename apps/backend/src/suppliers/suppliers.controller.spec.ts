import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { SupplierAlreadyExistsError } from './errors/supplier-already-exists.error';
import { SupplierNotFoundError } from './errors/supplier-not-found.error';

describe('SuppliersController', () => {
  let controller: SuppliersController;

  const mockSuppliersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        {
          provide: SuppliersService,
          useValue: mockSuppliersService,
        },
      ],
    }).compile();

    controller = module.get<SuppliersController>(SuppliersController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a supplier', async () => {
      const createDto: CreateSupplierDto = { name: 'Test Corp' };
      const expectedResult: SupplierResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Test Corp',
      };

      mockSuppliersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockSuppliersService.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw if supplier name already exists', async () => {
      const createDto: CreateSupplierDto = { name: 'Duplicate Corp' };

      mockSuppliersService.create.mockRejectedValue(
        new SupplierAlreadyExistsError(createDto.name),
      );

      await expect(
        controller.create({ name: 'Duplicate Corp' }),
      ).rejects.toThrow(SupplierAlreadyExistsError);
    });

    it('should throw if supplier name is invalid', async () => {
      mockSuppliersService.create.mockRejectedValue(new Error('Invalid name'));

      await expect(controller.create({ name: '' })).rejects.toThrow(Error);
    });
  });

  describe('findAll', () => {
    it('should return a list of suppliers', async () => {
      const expectedResult: SupplierResponseDto[] = [
        { id: 'clh0000000000000000000001', name: 'Corp 1' },
        { id: 'clh0000000000000000000002', name: 'Corp 2' },
      ];

      mockSuppliersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockSuppliersService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should forward pagination params to the service', async () => {
      const expectedResult: SupplierResponseDto[] = [
        { id: 'clh0000000000000000000001', name: 'Corp 1' },
        { id: 'clh0000000000000000000002', name: 'Corp 2' },
      ];

      mockSuppliersService.findAll.mockResolvedValue(expectedResult);

      const pagination = { page: 2, limit: 10 } as PaginationQueryDto;

      const result = await controller.findAll(pagination);

      expect(result).toEqual(expectedResult);
      expect(mockSuppliersService.findAll).toHaveBeenCalledWith(pagination);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Service failure');
      mockSuppliersService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow(Error);
    });

    it('should return an empty array when no suppliers exist', async () => {
      mockSuppliersService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(mockSuppliersService.findAll).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a supplier', async () => {
      const updateDto: UpdateSupplierDto = { name: 'Updated Corp' };
      const expectedResult: SupplierResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Updated Corp',
      };

      mockSuppliersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        'clh0000000000000000000001',
        updateDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockSuppliersService.update).toHaveBeenCalledWith(
        'clh0000000000000000000001',
        updateDto,
      );
    });

    it('should throw if supplier not found', async () => {
      mockSuppliersService.update.mockRejectedValue(
        new SupplierNotFoundError('clh0000000000000000000001'),
      );

      await expect(
        controller.update('clh0000000000000000000001', {
          name: 'Updated Corp',
        }),
      ).rejects.toThrow(SupplierNotFoundError);
    });

    it('should throw if supplier name is invalid', async () => {
      mockSuppliersService.update.mockRejectedValue(new Error('Invalid name'));

      await expect(
        controller.update('clh0000000000000000000001', { name: '' }),
      ).rejects.toThrow(Error);
    });

    it('should throw if supplier name already exists', async () => {
      const updateDto: UpdateSupplierDto = { name: 'Existing Corp' };

      mockSuppliersService.update.mockRejectedValue(
        new SupplierAlreadyExistsError(updateDto.name),
      );

      await expect(
        controller.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(SupplierAlreadyExistsError);
    });
  });

  describe('findOne', () => {
    it('should return a single supplier', async () => {
      const expectedResult: SupplierResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Corp 1',
      };

      mockSuppliersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('clh0000000000000000000001');

      expect(result).toEqual(expectedResult);
      expect(mockSuppliersService.findOne).toHaveBeenCalledWith(
        'clh0000000000000000000001',
      );
    });

    it('should throw if supplier not found', async () => {
      mockSuppliersService.findOne.mockRejectedValue(
        new SupplierNotFoundError('clh0000000000000000000001'),
      );

      await expect(
        controller.findOne('clh0000000000000000000001'),
      ).rejects.toThrow(SupplierNotFoundError);
    });
  });

  describe('remove', () => {
    it('should delete a supplier', async () => {
      mockSuppliersService.remove.mockResolvedValue(undefined);
      const result = await controller.remove('clh0000000000000000000001');

      expect(result).toBeUndefined();
      expect(mockSuppliersService.remove).toHaveBeenCalledTimes(1);
      expect(mockSuppliersService.remove).toHaveBeenCalledWith(
        'clh0000000000000000000001',
      );
    });

    it('should throw if supplier not found', async () => {
      const supplierId = 'clh0000000000000000000001';

      mockSuppliersService.remove.mockRejectedValue(
        new SupplierNotFoundError(supplierId),
      );

      await expect(
        controller.remove('clh0000000000000000000001'),
      ).rejects.toThrow(SupplierNotFoundError);
    });
  });
});
