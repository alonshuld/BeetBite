import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from './users.service';
import { UserNotFoundError } from './errors/user-not-found.error';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(),
    },
  };

  const mockUser = {
    id: 'user-1',
    username: 'admin',
    passwordHash: '$2b$12$hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByUsername', () => {
    it('should return a user when found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByUsername('admin');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'admin' },
      });
    });

    it('should throw UserNotFoundError when username does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findByUsername('unknown')).rejects.toThrow(
        UserNotFoundError,
      );
    });

    it('should include the username in the error message', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findByUsername('ghost')).rejects.toThrow(
        "User 'ghost' not found",
      );
    });
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should throw UserNotFoundError when ID does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        UserNotFoundError,
      );
    });

    it('should include the ID in the error message', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('bad-id')).rejects.toThrow(
        "User 'bad-id' not found",
      );
    });
  });
});
