import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { PaginationQueryDto } from 'src/common/pagination-query.dto';
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
      id: '1',
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
          id: '1',
          name: 'Client 1',
        },
        {
          id: '2',
          name: 'Client 2',
        },
      ];
      mockPrismaService.client.findMany.mockResolvedValue(mockClients);

      const result = await service.findAll();

      expect(result).toEqual([
        { id: '1', name: 'Client 1' },
        { id: '2', name: 'Client 2' },
      ]);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });

    it('should apply pagination params when provided', async () => {
      const mockClients = [
        {
          id: '3',
          name: 'Client 3',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients);

      const result = await service.findAll({
        page: 2,
        limit: 1,
      } as PaginationQueryDto);

      expect(result).toEqual([{ id: '3', name: 'Client 3' }]);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        skip: 1,
        take: 1,
      });
    });
  });

  describe('findOne', () => {
    const mockClient = {
      id: '1',
      name: 'Test Client',
    };

    it('should return a client', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);

      const result = await service.findOne('1');

      expect(result).toEqual({
        id: mockClient.id,
        name: mockClient.name,
      });
    });

    it('should throw ClientNotFoundError when client not found', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(ClientNotFoundError);
    });
  });

  describe('update', () => {
    const updateDto: UpdateClientDto = { name: 'Updated Client' };
    const mockClient = {
      id: '1',
      name: 'Updated Client',
    };

    it('should update a client', async () => {
      mockPrismaService.client.update.mockResolvedValue(mockClient);

      const result = await service.update('1', updateDto);

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

      await expect(service.update('1', updateDto)).rejects.toThrow(
        ClientNotFoundError,
      );
    });

    it('should throw ClientAlreadyExistsError on duplicate name', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });
      mockPrismaService.client.update.mockRejectedValue(error);

      await expect(service.update('1', updateDto)).rejects.toThrow(
        ClientAlreadyExistsError,
      );
    });

    it('should not throw ClientAlreadyExistsError when name is not provided', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
      });
      mockPrismaService.client.update.mockRejectedValue(error);

      await expect(service.update('1', {} as UpdateClientDto)).rejects.toThrow(
        PrismaClientKnownRequestError,
      );
    });
  });

  describe('remove', () => {
    const mockClient = {
      id: '1',
      name: 'Test Client',
    };

    it('should delete a client', async () => {
      mockPrismaService.client.delete.mockResolvedValue(mockClient);

      const result = await service.remove('1');

      expect(result).toBeUndefined();
    });

    it('should throw ClientNotFoundError when client not found', async () => {
      const error = new PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });
      mockPrismaService.client.delete.mockRejectedValue(error);

      await expect(service.remove('1')).rejects.toThrow(ClientNotFoundError);
    });
  });
});
