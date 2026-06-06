import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { ClientAlreadyExistsError } from './errors/client-already-exists.exception';
import { ClientNotFoundError } from './errors/client-not-found.exception';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ClientsService', () => {
  let service: ClientsService;

  const mockPrismaService = {
    client: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateClientDto = { name: 'Test Client' };
    const mockClient = {
      id: 'clh0000000000000000000001',
      name: 'Test Client',
    };

    it('should create a client', async () => {
      mockPrismaService.client.create.mockResolvedValue(mockClient);

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: mockClient.id,
        name: mockClient.name,
      });
      expect(mockPrismaService.client.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw ClientAlreadyExistsError on duplicate name', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });
      mockPrismaService.client.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        ClientAlreadyExistsError,
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of clients', async () => {
      const mockClients = [
        {
          id: 'clh0000000000000000000001',
          name: 'Client 1',
        },
        {
          id: 'clh0000000000000000000002',
          name: 'Client 2',
        },
      ];
      mockPrismaService.client.findMany.mockResolvedValue(mockClients);

      const result = await service.findAll();

      expect(result).toEqual([
        { id: 'clh0000000000000000000001', name: 'Client 1' },
        { id: 'clh0000000000000000000002', name: 'Client 2' },
      ]);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });

    it('should apply pagination params when provided', async () => {
      const mockClients = [
        {
          id: 'clh0000000000000000000003',
          name: 'Client 3',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients);

      const result = await service.findAll({
        page: 2,
        limit: 1,
      });

      expect(result).toEqual([
        { id: 'clh0000000000000000000003', name: 'Client 3' },
      ]);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        skip: 1,
        take: 1,
      });
    });

    it('should clamp skip to 0 when page is 0', async () => {
      mockPrismaService.client.findMany.mockResolvedValue([]);

      await service.findAll({ page: 0, limit: 10 });

      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });

    it('should clamp take to 1 when limit is 0', async () => {
      mockPrismaService.client.findMany.mockResolvedValue([]);

      await service.findAll({ page: 1, limit: 0 });

      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 1,
      });
    });
  });

  describe('findOne', () => {
    const mockClient = {
      id: 'clh0000000000000000000001',
      name: 'Test Client',
    };

    it('should return a client', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);

      const result = await service.findOne('clh0000000000000000000001');

      expect(result).toEqual({
        id: mockClient.id,
        name: mockClient.name,
      });
    });

    it('should throw ClientNotFoundError when client not found', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('clh0000000000000000000001'),
      ).rejects.toThrow(ClientNotFoundError);
    });
  });

  describe('update', () => {
    const updateDto: UpdateClientDto = { name: 'Updated Client' };
    const mockClient = {
      id: 'clh0000000000000000000001',
      name: 'Updated Client',
    };

    it('should update a client', async () => {
      mockPrismaService.client.update.mockResolvedValue(mockClient);

      const result = await service.update(
        'clh0000000000000000000001',
        updateDto,
      );

      expect(result).toEqual({
        id: mockClient.id,
        name: mockClient.name,
      });
    });

    it('should throw ClientNotFoundError when client not found', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });
      mockPrismaService.client.update.mockRejectedValue(error);

      await expect(
        service.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(ClientNotFoundError);
    });

    it('should throw ClientAlreadyExistsError on duplicate name', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });
      mockPrismaService.client.update.mockRejectedValue(error);

      await expect(
        service.update('clh0000000000000000000001', updateDto),
      ).rejects.toThrow(ClientAlreadyExistsError);
    });
  });

  describe('remove', () => {
    const CLIENT_ID = 'clh0000000000000000000001';
    const mockClient = { id: CLIENT_ID, name: 'Test Client' };

    interface TxMock {
      project: { findMany: jest.Mock; deleteMany: jest.Mock };
      projectReport: { findMany: jest.Mock; deleteMany: jest.Mock };
      projectReportIncome: { deleteMany: jest.Mock };
      corporationPayment: { deleteMany: jest.Mock };
      subcontractorPayment: { deleteMany: jest.Mock };
      client: { delete: jest.Mock };
    }

    let txMock: TxMock;
    let callOrder: string[];

    beforeEach(() => {
      callOrder = [];
      txMock = {
        project: {
          findMany: jest.fn().mockImplementation(() => {
            callOrder.push('project.findMany');
            return Promise.resolve([{ id: 'project-1' }]);
          }),
          deleteMany: jest.fn().mockImplementation(() => {
            callOrder.push('project.deleteMany');
            return Promise.resolve({ count: 1 });
          }),
        },
        projectReport: {
          findMany: jest.fn().mockImplementation(() => {
            callOrder.push('projectReport.findMany');
            return Promise.resolve([{ id: 'report-1' }]);
          }),
          deleteMany: jest.fn().mockImplementation(() => {
            callOrder.push('projectReport.deleteMany');
            return Promise.resolve({ count: 1 });
          }),
        },
        projectReportIncome: {
          deleteMany: jest.fn().mockImplementation(() => {
            callOrder.push('projectReportIncome.deleteMany');
            return Promise.resolve({ count: 1 });
          }),
        },
        corporationPayment: {
          deleteMany: jest.fn().mockImplementation(() => {
            callOrder.push('corporationPayment.deleteMany');
            return Promise.resolve({ count: 0 });
          }),
        },
        subcontractorPayment: {
          deleteMany: jest.fn().mockImplementation(() => {
            callOrder.push('subcontractorPayment.deleteMany');
            return Promise.resolve({ count: 0 });
          }),
        },
        client: {
          delete: jest.fn().mockImplementation(() => {
            callOrder.push('client.delete');
            return Promise.resolve(mockClient);
          }),
        },
      };
    });

    it('should delete a client and cascade all related records', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.$transaction.mockImplementation(
        (cb: (tx: TxMock) => Promise<void>) => cb(txMock),
      );

      const result = await service.remove(CLIENT_ID);

      expect(result).toBeUndefined();
      expect(mockPrismaService.client.findUnique).toHaveBeenCalledWith({
        where: { id: CLIENT_ID },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.client.delete).toHaveBeenCalledWith({
        where: { id: CLIENT_ID },
      });
    });

    it('should cascade deletes in the correct dependency order', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.$transaction.mockImplementation(
        (cb: (tx: TxMock) => Promise<void>) => cb(txMock),
      );

      await service.remove(CLIENT_ID);

      expect(callOrder).toEqual([
        'project.findMany',
        'projectReport.findMany',
        'projectReportIncome.deleteMany',
        'corporationPayment.deleteMany',
        'projectReport.deleteMany',
        'subcontractorPayment.deleteMany',
        'project.deleteMany',
        'client.delete',
      ]);
    });

    it('should throw ClientNotFoundError when client does not exist', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(null);

      await expect(service.remove(CLIENT_ID)).rejects.toThrow(
        ClientNotFoundError,
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });
});
