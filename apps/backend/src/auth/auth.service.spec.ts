import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserNotFoundError } from '../users/errors/user-not-found.error';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByUsername: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    username: 'admin',
    passwordHash: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return the user when credentials are valid', async () => {
      const password = 'secret';
      const hash = await bcrypt.hash(password, 10);
      const user = { ...mockUser, passwordHash: hash };

      mockUsersService.findByUsername.mockResolvedValue(user);

      const result = await service.validateUser('admin', password);

      expect(result).toEqual(user);
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith('admin');
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockUsersService.findByUsername.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
      });

      await expect(service.validateUser('admin', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should propagate UserNotFoundError when username does not exist', async () => {
      mockUsersService.findByUsername.mockRejectedValue(
        new UserNotFoundError('ghost'),
      );

      await expect(service.validateUser('ghost', 'any')).rejects.toThrow(
        UserNotFoundError,
      );
    });
  });

  describe('login', () => {
    it('should return a signed access token', () => {
      mockJwtService.sign.mockReturnValue('signed.jwt.token');

      const result = service.login(mockUser);

      expect(result).toEqual({ accessToken: 'signed.jwt.token' });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        username: mockUser.username,
      });
    });
  });
});
