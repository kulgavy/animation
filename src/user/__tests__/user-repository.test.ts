import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { PrismaClient, User } from '@prisma/client';
import UserRepository from '../user-repository';

type MockReturnType = User | null;

// Mock PrismaClient
const mockFindUnique = mock(async () => null as MockReturnType);
const mockPrismaClient = {
  user: {
    findUnique: mockFindUnique,
  },
} as unknown as PrismaClient;

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository(mockPrismaClient);
    mockFindUnique.mockReset();
  });

  describe('findById', () => {
    it('should return user when user exists', async () => {
      // Arrange
      const mockUser: User = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed_password',
        type: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindUnique.mockImplementation(async () => mockUser);

      // Act
      const result = await userRepository.findById('123');

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should return null when user does not exist', async () => {
      // Arrange
      mockFindUnique.mockImplementation(async () => null);

      // Act
      const result = await userRepository.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when email exists', async () => {
      // Arrange
      const mockUser: User = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed_password',
        type: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindUnique.mockImplementation(async () => mockUser);

      // Act
      const result = await userRepository.findByEmail('test@example.com');

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should return null when email does not exist', async () => {
      // Arrange
      mockFindUnique.mockImplementation(async () => null);

      // Act
      const result = await userRepository.findByEmail('non-existent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });
});
