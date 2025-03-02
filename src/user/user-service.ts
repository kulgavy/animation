import UserRepository from './user-repository'; // assuming you have this imported
import { Nullable } from '../types/basic-type';
import { PrismaClient, User } from '@prisma/client';

class UserService {
  private readonly userRepository: UserRepository;

  constructor(prisma: PrismaClient) {
    this.userRepository = new UserRepository(prisma);
  }

  // Find a user by ID
  async getUserById(id: string): Promise<Nullable<User>> {
    return this.userRepository.findById(id);
  }

  // Find a user by Email
  async getUserByEmail(email: string): Promise<Nullable<User>> {
    return this.userRepository.findByEmail(email);
  }
}

export default UserService;
