import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';

import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';
import { UserNotFoundError } from '../../users/errors/user-not-found.error';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;

  const mockUser = {
    id: 'user-1',
    username: 'admin',
    passwordHash: '$2b$12$hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthService = {
    validateUser: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return the user when credentials are valid', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate('admin', 'secret');

      expect(result).toEqual(mockUser);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        'admin',
        'secret',
      );
    });

    it('should throw UnauthorizedException when validateUser throws UnauthorizedException', async () => {
      mockAuthService.validateUser.mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(strategy.validate('admin', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should propagate UserNotFoundError when user does not exist', async () => {
      mockAuthService.validateUser.mockRejectedValue(
        new UserNotFoundError('ghost'),
      );

      await expect(strategy.validate('ghost', 'any')).rejects.toThrow(
        UserNotFoundError,
      );
    });
  });
});
