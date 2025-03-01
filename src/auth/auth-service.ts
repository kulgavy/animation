import { sign } from 'hono/jwt';
import { Nullable } from '../types/basic-type';
import UserService from '../user/user-service';
import { UserPayload } from '../middleware/auth/type';
import { SIGNATURE_ALGORITHM, TOKEN_EXPIRATION_DAYS } from './constant';
import dayjs from 'dayjs';
import { PrismaClient } from '@prisma/client';
import { UserType } from '../user/constant';
import { Logger } from '../logger/logger';

class AuthService {
  private readonly userService: UserService;
  private readonly secretKey!: string;
  private readonly logger: Logger;

  constructor(env: CloudflareBindings, prisma: PrismaClient) {
    this.userService = new UserService(prisma);
    this.secretKey = env.JWT_SECRET;
    this.logger = new Logger(env.CHARACTER_LOGS);
  }

  async login(email: string, password: string): Promise<Nullable<string>> {
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      await this.logger.log(AuthService.name, `User not found: email=${email}`);
      return null;
    }

    const isPasswordValid = password === user.password;
    if (!isPasswordValid) {
      await this.logger.log(AuthService.name, `Invalid password for user: email=${email}`);
      return null;
    }
    const userPayload: UserPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      type: user.type as UserType,
    };

    await this.logger.log(AuthService.name, `User payload: ${userPayload}`);

    const exp = dayjs().add(TOKEN_EXPIRATION_DAYS, 'days').unix();

    return sign({ ...userPayload, exp: exp }, this.secretKey, SIGNATURE_ALGORITHM);
  }
}

export default AuthService;
