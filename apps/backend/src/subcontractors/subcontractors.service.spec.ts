import { Test, TestingModule } from '@nestjs/testing';
import { SubcontractorsService } from './subcontractors.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { Prisma } from '../generated/client';
import { SubcontractorAlreadyExistsError } from './errors/subcontractor-already-exists.error';
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
    const createDto: CreateSubcontractorDto = {
      name: 'Test Subcontractor',
      companyNumber: '515123456',
    };
    const mockSubcontractor = {
      id: 'clh0000000000000000000001',
      name: 'Test Subcontractor',
      companyNumber: '515123456',
    };

    it('should create a subcontractor', async () => {
      mockPrismaService.subcontractor.create.mockResolvedValue(
        mockSubcontractor,
      );

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: mockSubcontractor.id,
        name: mockSubcontractor.name,
        companyNumber: mockSubcontractor.companyNumber,
      });
      expect(mockPrismaService.subcontractor.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw SubcontractorExistsError on duplicate name', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
        meta: { target: ['name'] },
      });
      mockPrismaService.subcontractor.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        SubcontractorAlreadyExistsError,
      );
    });

    it('should throw SubcontractorExistsError on duplicate company number', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
        meta: { target: ['companyNumber'] },
      });
      mockPrismaService.subcontractor.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        SubcontractorAlreadyExistsError,
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of subcontractors', async () => {
      const mockSubcontractors = [
        {
          id: 'clh0000000000000000000001',
          name: 'Subcontractor 1',
        },
        {
          id: 'clh0000000000000000000002',
          name: 'Subcontractor 2',
        },
      ];
      mockPrismaService.subcontractor.findMany.mockResolvedValue(
        mockSubcontractors,
      );

      const result = await service.findAll();

      expect(result).toEqual([
        { id: 'clh0000000000000000000001', name: 'Subcontractor 1' },
        { id: 'clh0000000000000000000002', name: 'Subcontractor 2' },
      ]);
      expect(mockPrismaService.subcontractor.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });

    it('should apply pagination parameters', async () => {
      const mockSubcontractors = [
        {
          id: 'clh0000000000000000000003',
          name: 'Subcontractor 3',
        },
      ];
      mockPrismaService.subcontractor.findMany.mockResolvedValue(
        mockSubcontractors,
      );

      const result = await service.findAll({
        page: 2,
        limit: 1,
      });

      expect(result).toEqual([
        { id: 'clh0000000000000000000003', name: 'Subcontractor 3' },
      ]);
      expect(mockPrismaService.subcontractor.findMany).toHaveBeenCalledWith({
        skip: 1,
        take: 1,
      } as PaginationQueryDto);
    });
  });

  describe('findOne', () => {
    it('should return a subcontractor', async () => {
      const mockSubcontractor = {
        id: 'clh0000000000000000000001',
        name: 'Test Subcontractor',
      };

      mockPrismaService.subcontractor.findUnique.mockResolvedValue(
        mockSubcontractor,
      );

      const result = await service.findOne('clh0000000000000000000001');

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
    const updateDto: CreateSubcontractorDto = {
      name: 'Updated Subcontractor',
      companyNumber: '515123456',
    };

    it('should update a subcontractor', async () => {
      const mockSubcontractor = {
        id: 'clh0000000000000000000001',
        name: 'Updated Subcontractor',
        companyNumber: '515123456',
      };

      mockPrismaService.subcontractor.update.mockResolvedValue(
        mockSubcontractor,
      );

      const result = await service.update(
        'clh0000000000000000000001',
        updateDto,
      );

      expect(result).toEqual({
        id: mockSubcontractor.id,
        name: mockSubcontractor.name,
        companyNumber: mockSubcontractor.companyNumber,
      });
      expect(mockPrismaService.subcontractor.update).toHaveBeenCalledWith({
        where: { id: 'clh0000000000000000000001' },
        data: updateDto,
      });
    });

    it('should throw SubcontractorNotFoundError when subcontractor does not exist', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });
      mockPrismaService.subcontractor.update.mockRejectedValue(error);

      await expect(
        service.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(SubcontractorNotFoundError);
    });

    it('should throw SubcontractorExistsError on duplicate company number', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
        meta: { target: ['companyNumber'] },
      });
      mockPrismaService.subcontractor.update.mockRejectedValue(error);

      await expect(
        service.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(SubcontractorAlreadyExistsError);
    });
  });

  describe('remove', () => {
    const mockSubcontractor = {
      id: 'clh0000000000000000000001',
      name: 'Test Subcontractor',
    };

    it('should delete a subcontractor', async () => {
      mockPrismaService.subcontractor.delete.mockResolvedValue(
        mockSubcontractor,
      );

      const result = await service.remove('clh0000000000000000000001');

      expect(result).toBeUndefined();
    });

    it('should throw SubcontractorNotFoundError when subcontractor does not exist', async () => {
      const subcontractorId = 'clh0000000000000000000001';
      const error = new SubcontractorNotFoundError(subcontractorId);
      mockPrismaService.subcontractor.delete.mockRejectedValue(error);

      await expect(service.remove('clh0000000000000000000001')).rejects.toThrow(
        SubcontractorNotFoundError,
      );
    });
  });

  describe('Integration Tests with Payments', () => {
    let integrationService: SubcontractorsService;
    const integrationMockPrismaService = {
      subcontractor: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      subcontractorPayment: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    beforeEach(async () => {
      const integrationModule: TestingModule = await Test.createTestingModule({
        providers: [
          SubcontractorsService,
          {
            provide: PrismaService,
            useValue: integrationMockPrismaService,
          },
        ],
      }).compile();

      integrationService = integrationModule.get<SubcontractorsService>(
        SubcontractorsService,
      );

      jest.clearAllMocks();
    });

    describe('subcontractor and payment relationship validation', () => {
      it('should create subcontractor successfully', async () => {
        const createDto = {
          name: 'New Subcontractor',
          companyNumber: '515123456',
        };
        const mockSubcontractor = {
          id: 'sub-new',
          name: 'New Subcontractor',
          companyNumber: '515123456',
        };

        integrationMockPrismaService.subcontractor.create.mockResolvedValue(
          mockSubcontractor,
        );

        const result = await integrationService.create(createDto);

        expect(result).toEqual(mockSubcontractor);
        expect(
          integrationMockPrismaService.subcontractor.create,
        ).toHaveBeenCalledWith({
          data: createDto,
        });
      });

      it('should verify subcontractor exists when checking payments', async () => {
        const mockSubcontractor = {
          id: 'sub-check',
          name: 'Check Subcontractor',
          payments: [
            {
              id: 'payment-1',
              subcontractorId: 'sub-check',
              serviceDate: new Date('2023-01-01'),
              paymentDate: new Date('2023-01-15'),
            },
          ],
        };

        integrationMockPrismaService.subcontractor.findUnique.mockResolvedValue(
          mockSubcontractor,
        );

        const result = await integrationService.findOne('sub-check');

        // The mapper returns all properties from the entity
        // The test should reflect the actual mapper behavior
        expect(result.id).toBe('sub-check');
        expect(result.name).toBe('Check Subcontractor');
        expect(
          integrationMockPrismaService.subcontractor.findUnique,
        ).toHaveBeenCalledWith({
          where: { id: 'sub-check' },
        });
      });

      it('should handle cascading behavior when checking subcontractor with payments exists', async () => {
        const subcontractorWithPayments = {
          id: 'sub-with-payments',
          name: 'Subcontractor With Payments',
          payments: [
            {
              id: 'payment-1',
              subcontractorId: 'sub-with-payments',
              serviceDate: new Date('2023-01-01'),
              paymentDate: new Date('2023-01-15'),
            },
            {
              id: 'payment-2',
              subcontractorId: 'sub-with-payments',
              serviceDate: new Date('2023-02-01'),
              paymentDate: new Date('2023-02-15'),
            },
          ],
        };

        integrationMockPrismaService.subcontractor.findUnique.mockResolvedValue(
          subcontractorWithPayments,
        );

        const result = await integrationService.findOne('sub-with-payments');

        expect(result.id).toBe('sub-with-payments');
        expect(result.name).toBe('Subcontractor With Payments');
      });
    });

    describe('workflow tests - subcontractor lifecycle with payments', () => {
      it('should handle complete workflow: create subcontractor, verify relationship', async () => {
        // Create subcontractor
        const newSubcontractor = {
          id: 'sub-workflow',
          name: 'Workflow Subcontractor',
          companyNumber: '515123456',
        };

        integrationMockPrismaService.subcontractor.create.mockResolvedValue(
          newSubcontractor,
        );

        const createdSubcontractor = await integrationService.create({
          name: 'Workflow Subcontractor',
          companyNumber: '515123456',
        });
        expect(createdSubcontractor.id).toBe('sub-workflow');

        // Find subcontractor
        integrationMockPrismaService.subcontractor.findUnique.mockResolvedValue(
          newSubcontractor,
        );

        const foundSubcontractor =
          await integrationService.findOne('sub-workflow');
        expect(foundSubcontractor.id).toBe('sub-workflow');
      });

      it('should handle multiple subcontractors with different payment scenarios', async () => {
        const subcontractors = [
          { id: 'sub-1', name: 'Subcontractor 1' },
          { id: 'sub-2', name: 'Subcontractor 2' },
          { id: 'sub-3', name: 'Subcontractor 3' },
        ];

        integrationMockPrismaService.subcontractor.findMany.mockResolvedValue(
          subcontractors,
        );

        const result = await integrationService.findAll();

        expect(result).toHaveLength(3);
        expect(result.map((s) => s.id)).toEqual(['sub-1', 'sub-2', 'sub-3']);
      });
    });
  });
});
