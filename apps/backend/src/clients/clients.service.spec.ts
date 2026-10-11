import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { ClientAlreadyExistsError } from './errors/client-already-exists.exception';
import { EntityHasRelatedRecordsError } from 'src/common/errors/entity-has-related-records.error';
import { ClientNotFoundError } from './errors/client-not-found.exception';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ClientsService', () => {
  let service: ClientsService;

  const mockPrismaService = {
    client: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    projectClientAssignment: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
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

    vi.clearAllMocks();
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

    it('should delete a client that has never owned a project', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.projectClientAssignment.findMany.mockResolvedValue([]);

      const result = await service.remove(CLIENT_ID);

      expect(result).toBeUndefined();
      expect(mockPrismaService.client.delete).toHaveBeenCalledWith({
        where: { id: CLIENT_ID },
      });
    });

    it('should refuse to delete a client that currently owns a project', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.projectClientAssignment.findMany.mockResolvedValue([
        { project: { name: 'Jerusalem Centre' } },
      ]);

      await expect(service.remove(CLIENT_ID)).rejects.toThrow(
        EntityHasRelatedRecordsError,
      );
      expect(mockPrismaService.client.delete).not.toHaveBeenCalled();
    });

    // 🔴 Regression test for a real data-loss bug. remove() used to hard-cascade
    // through every project whose cached clientId was this client, deleting
    // their reports, income entries and payments. Once a project can be
    // transferred that cascade destroys months belonging to a *different*
    // client. Deleting a client that has ever held a project must refuse.
    it('should refuse to delete a client whose project has since been transferred away', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      // The project now belongs to someone else, but this client still holds a
      // past assignment on it — those months are this client's history and the
      // project is not this client's to delete.
      mockPrismaService.projectClientAssignment.findMany.mockResolvedValue([
        { project: { name: 'Transferred Project' } },
      ]);

      await expect(service.remove(CLIENT_ID)).rejects.toThrow(
        EntityHasRelatedRecordsError,
      );
      expect(mockPrismaService.client.delete).not.toHaveBeenCalled();
    });

    it('should name the projects standing in the way', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.projectClientAssignment.findMany.mockResolvedValue([
        { project: { name: 'Project B' } },
        { project: { name: 'Project A' } },
        // The same project appears once per assignment — it must be named once.
        { project: { name: 'Project A' } },
      ]);

      await expect(service.remove(CLIENT_ID)).rejects.toThrow(
        /Project A, Project B/,
      );
    });

    it('should throw ClientNotFoundError when client does not exist', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(null);

      await expect(service.remove(CLIENT_ID)).rejects.toThrow(
        ClientNotFoundError,
      );
      expect(mockPrismaService.client.delete).not.toHaveBeenCalled();
    });
  });
});
