import { Test, TestingModule } from '@nestjs/testing';

import { AuthController, RequestWithUser } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { User } from '../generated/client';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-1',
    username: 'admin',
    passwordHash: '$2b$12$hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return an access token', () => {
      const loginDto: LoginDto = { username: 'admin', password: 'secret' };
      const expected: LoginResponseDto = { accessToken: 'signed.jwt.token' };
      const mockRequest = { user: mockUser } as unknown as RequestWithUser;

      mockAuthService.login.mockReturnValue(expected);

      const result = controller.login(loginDto, mockRequest);

      expect(result).toEqual(expected);
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
    });

    it('should propagate errors from the service', () => {
      const mockRequest = { user: mockUser } as unknown as RequestWithUser;
      mockAuthService.login.mockImplementation(() => {
        throw new Error('JWT sign failure');
      });

      expect(() =>
        controller.login({ username: 'admin', password: 'x' }, mockRequest),
      ).toThrow('JWT sign failure');
    });
  });
});
