import { describe, expect, test, beforeEach, spyOn, mock, Mock } from 'bun:test';
import type { Bindings as CloudflareBindings } from 'hono/types';
import type { KVNamespace } from '@cloudflare/workers-types';
import AuthService from '../auth-service';
import { PrismaClient } from '@prisma/client';
import { UserType } from '../../user/constant';
import UserService from '../../user/user-service';
import { Logger } from '../../logger/logger';

const getMockCalls = (fn: any) => (fn as Mock<(...args: any[]) => any>).mock.calls;

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: PrismaClient;
  let mockUserService: UserService;
  let mockLogger: Logger;

  const mockKV: KVNamespace = {
    get: async () => null,
    put: async () => {},
    delete: async () => {},
    list: async () => ({
      keys: [],
      list_complete: true,
      cursor: '',
      cacheStatus: null,
    }),
    getWithMetadata: async () => ({
      value: null,
      metadata: null,
      cacheStatus: null,
    }),
  };

  const mockEnv = {
    JWT_SECRET: 'test-secret',
    CHARACTER_LOGS: mockKV,
  } satisfies Partial<CloudflareBindings>;

  beforeEach(() => {
    mockPrisma = {} as PrismaClient;
    mockUserService = new UserService(mockPrisma);
    mockLogger = new Logger(mockEnv.CHARACTER_LOGS!);

    (mockUserService.getUserByEmail as Mock<typeof mockUserService.getUserByEmail>) = mock(() =>
      Promise.resolve(null),
    );
    spyOn(mockLogger, 'log');

    authService = new AuthService(mockEnv as CloudflareBindings, mockPrisma);
    // @ts-expect-error Private field access for testing
    authService['userService'] = mockUserService;
    // @ts-expect-error Private field access for testing
    authService['logger'] = mockLogger;
  });

  describe('login', () => {
    test('should return null when user is not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';
      (mockUserService.getUserByEmail as Mock<typeof UserService.prototype.getUserByEmail>) = mock(
        () => Promise.resolve(null),
      );

      const result = await authService.login(email, password);

      expect(result).toBeNull();
      expect(getMockCalls(mockUserService.getUserByEmail).length).toBe(1);
      expect(getMockCalls(mockUserService.getUserByEmail)[0][0]).toBe(email);
    });

    test('should return null when password is invalid', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'correctpassword',
        name: 'Test User',
        type: UserType.User,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockUserService.getUserByEmail as Mock<typeof mockUserService.getUserByEmail>) = mock(() =>
        Promise.resolve(mockUser),
      );

      const result = await authService.login(email, password);

      expect(result).toBeNull();
      expect(getMockCalls(mockUserService.getUserByEmail).length).toBe(1);
      expect(getMockCalls(mockUserService.getUserByEmail)[0][0]).toBe(email);
    });

    test('should return JWT token when credentials are valid', async () => {
      const email = 'test@example.com';
      const password = 'correctpassword';
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'correctpassword',
        name: 'Test User',
        type: UserType.User,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockUserService.getUserByEmail as Mock<typeof mockUserService.getUserByEmail>) = mock(() =>
        Promise.resolve(mockUser),
      );

      const result = await authService.login(email, password);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(getMockCalls(mockUserService.getUserByEmail).length).toBe(1);
      expect(getMockCalls(mockUserService.getUserByEmail)[0][0]).toBe(email);
    });
  });
});
