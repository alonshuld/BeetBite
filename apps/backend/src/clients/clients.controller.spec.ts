import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientResponseDto } from './dto/client-response.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';

describe('ClientsController', () => {
  let controller: ClientsController;

  const mockClientsService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
      ],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a client', async () => {
      const createDto: CreateClientDto = { name: 'Test Client' };
      const expectedResult: ClientResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Test Client',
      };

      mockClientsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockClientsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw if client name already exists', async () => {
      mockClientsService.create.mockRejectedValue(
        new Error('Client already exists'),
      );

      await expect(
        controller.create({ name: 'Duplicate Client' }),
      ).rejects.toThrow('Client already exists');
    });

    it('should throw if client name is invalid', async () => {
      mockClientsService.create.mockRejectedValue(new Error('Invalid name'));

      await expect(controller.create({ name: '' })).rejects.toThrow(
        'Invalid name',
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of clients', async () => {
      const expectedResult: ClientResponseDto[] = [
        { id: 'clh0000000000000000000001', name: 'Client 1' },
        { id: 'clh0000000000000000000002', name: 'Client 2' },
      ];

      mockClientsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockClientsService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should forward pagination params to the service', async () => {
      const expectedResult: ClientResponseDto[] = [
        { id: 'clh0000000000000000000003', name: 'Client 3' },
      ];

      mockClientsService.findAll.mockResolvedValue(expectedResult);

      const pagination = { page: 2, limit: 1 } as PaginationQueryDto;

      const result = await controller.findAll(pagination);

      expect(result).toEqual(expectedResult);
      expect(mockClientsService.findAll).toHaveBeenCalledWith(pagination);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Service failure');
      mockClientsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow('Service failure');
    });

    it('should return an empty array when no clients exist', async () => {
      mockClientsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update a client', async () => {
      const updateDto: UpdateClientDto = { name: 'Updated Client' };
      const expectedResult: ClientResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Updated Client',
      };

      mockClientsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        'clh0000000000000000000001',
        updateDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockClientsService.update).toHaveBeenCalledWith(
        'clh0000000000000000000001',
        updateDto,
      );
    });

    it('should throw if client not found', async () => {
      mockClientsService.update.mockRejectedValue(
        new Error('Client not found'),
      );

      await expect(
        controller.update('clh0000000000000000000001', {
          name: 'Updated Client',
        }),
      ).rejects.toThrow('Client not found');
    });

    it('should throw if client name is invalid', async () => {
      mockClientsService.update.mockRejectedValue(new Error('Invalid name'));

      await expect(
        controller.update('clh0000000000000000000001', { name: '' }),
      ).rejects.toThrow('Invalid name');
    });

    it('should throw if client name already exists', async () => {
      mockClientsService.update.mockRejectedValue(
        new Error('Client with this name already exists'),
      );

      await expect(
        controller.update('clh0000000000000000000001', {
          name: 'Duplicate Client',
        }),
      ).rejects.toThrow('Client with this name already exists');
    });
  });

  describe('findOne', () => {
    it('should return a single client', async () => {
      const expectedResult: ClientResponseDto = {
        id: 'clh0000000000000000000001',
        name: 'Client 1',
      };

      mockClientsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('clh0000000000000000000001');

      expect(result).toEqual(expectedResult);
      expect(mockClientsService.findOne).toHaveBeenCalledWith(
        'clh0000000000000000000001',
      );
    });

    it('should throw if client not found', async () => {
      mockClientsService.findOne.mockRejectedValue(
        new Error('Client not found'),
      );

      await expect(
        controller.findOne('clh0000000000000000000999'),
      ).rejects.toThrow('Client not found');
      expect(mockClientsService.findOne).toHaveBeenCalledWith(
        'clh0000000000000000000999',
      );
    });
  });

  describe('remove', () => {
    it('should delete a client', async () => {
      mockClientsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('clh0000000000000000000001');

      expect(result).toBeUndefined();
      expect(mockClientsService.remove).toHaveBeenCalledTimes(1);
      expect(mockClientsService.remove).toHaveBeenCalledWith(
        'clh0000000000000000000001',
      );
    });

    it('should throw if client not found', async () => {
      mockClientsService.remove.mockRejectedValue(
        new Error('Client not found'),
      );

      await expect(
        controller.remove('clh0000000000000000000001'),
      ).rejects.toThrow('Client not found');
    });
  });
});
