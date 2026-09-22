import { ConflictException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../src/modules/auth/auth.service.js';

describe('AuthService Unit Tests', () => {
  let authService: AuthService;
  let mockUsersService: any;
  let mockJwtService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockUsersService = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
    };

    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('signed_jwt_token'),
      verifyAsync: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'auth.jwtSecret') return 'test_jwt_secret_key_32chars_long!';
        if (key === 'auth.jwtAccessExpiration') return '15m';
        if (key === 'auth.jwtRefreshExpiration') return '14d';
        return null;
      }),
    };

    authService = new AuthService(
      mockUsersService,
      mockJwtService,
      mockConfigService,
    );
  });

  describe('register', () => {
    it('should register a new user and return user + tokens', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 'user_new_uuid',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date(),
      });

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      expect(result.user).toBeDefined();
      expect(result.tokens.accessToken).toBe('signed_jwt_token');
      expect(result.tokens.refreshToken).toBe('signed_jwt_token');
      expect(mockUsersService.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already registered', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'existing_uuid',
        email: 'test@example.com',
      });

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should verify password and return tokens on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('ValidPassword123!', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user_uuid',
        email: 'user@example.com',
        passwordHash,
        name: 'User',
        role: 'USER',
        createdAt: new Date(),
      });

      const result = await authService.login({
        email: 'user@example.com',
        password: 'ValidPassword123!',
      });

      expect(result.tokens.accessToken).toBe('signed_jwt_token');
      expect(result.user.email).toBe('user@example.com');
    });

    it('should throw UnauthorizedException on incorrect password', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword!', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user_uuid',
        email: 'user@example.com',
        passwordHash,
      });

      await expect(
        authService.login({
          email: 'user@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
