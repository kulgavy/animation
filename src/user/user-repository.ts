import { Nullable } from '../types/basic-type';
import { PrismaClient, User } from '@prisma/client';

class UserRepository {
  private readonly prismaClient: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prismaClient = prisma;
  }

  async findById(id: string): Promise<Nullable<User>> {
    return this.prismaClient.user.findUnique({
      where: {
        id,
      },
    });
  }

  async findByEmail(email: string): Promise<Nullable<User>> {
    return this.prismaClient.user.findUnique({
      where: {
        email,
      },
    });
  }
}

export default UserRepository;
