import { describe, expect, test, beforeEach, spyOn, Mock } from 'bun:test';
import UserService from '../user-service';
import { PrismaClient, User } from '@prisma/client';
import { UserType } from '../constant';
import UserRepository from '../user-repository';

const getMockCalls = (fn: any) => (fn as Mock<(...args: any[]) => any>).mock.calls;

describe('UserService', () => {
  let userService: UserService;
  let mockPrisma: PrismaClient;
  let mockUserRepository: UserRepository;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    type: UserType.User,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {} as PrismaClient;
    mockUserRepository = new UserRepository(mockPrisma);

    spyOn(mockUserRepository, 'findById');
    spyOn(mockUserRepository, 'findByEmail');

    userService = new UserService(mockPrisma);
    Object.defineProperty(userService, 'userRepository', { value: mockUserRepository });
  });

  describe('getUserById', () => {
    test('should return user when found', async () => {
      // Arrange
      // @ts-expect-error Mock implementation for testing
      mockUserRepository.findById.mockImplementation(async () => mockUser);

      // Act
      const result = await userService.getUserById('1');

      // Assert
      expect(result).toEqual(mockUser);
      expect(getMockCalls(mockUserRepository.findById).length).toBe(1);
      expect(getMockCalls(mockUserRepository.findById)[0][0]).toBe('1');
    });

    test('should return null when user not found', async () => {
      // Arrange
      // @ts-expect-error Mock implementation for testing
      mockUserRepository.findById.mockImplementation(async () => null);

      // Act
      const result = await userService.getUserById('999');

      // Assert
      expect(result).toBeNull();
      expect(getMockCalls(mockUserRepository.findById).length).toBe(1);
      expect(getMockCalls(mockUserRepository.findById)[0][0]).toBe('999');
    });
  });

  describe('getUserByEmail', () => {
    test('should return user when found', async () => {
      // Arrange
      // @ts-expect-error Mock implementation for testing
      mockUserRepository.findByEmail.mockImplementation(async () => mockUser);

      // Act
      const result = await userService.getUserByEmail('test@example.com');

      // Assert
      expect(result).toEqual(mockUser);
      expect(getMockCalls(mockUserRepository.findByEmail).length).toBe(1);
      expect(getMockCalls(mockUserRepository.findByEmail)[0][0]).toBe('test@example.com');
    });

    test('should return null when user not found', async () => {
      // Arrange
      // @ts-expect-error Mock implementation for testing
      mockUserRepository.findByEmail.mockImplementation(async () => null);

      // Act
      const result = await userService.getUserByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
      expect(getMockCalls(mockUserRepository.findByEmail).length).toBe(1);
      expect(getMockCalls(mockUserRepository.findByEmail)[0][0]).toBe('nonexistent@example.com');
    });
  });
});
