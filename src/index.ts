import { Hono } from 'hono';
import { authMiddleware } from './middleware/auth';
import { ApiResponse, Variables } from './types/basic-type';
import AuthService from './auth/auth-service';
import { logger } from 'hono/logger';
import prismaClients from '../prisma/client';
import { UserType } from './user/constant';
import { zValidator } from '@hono/zod-validator';
import { CharacterHistory } from './durable/character/character-history';
import { Logger } from './logger/logger';
import { HTTP_STATUS, HTTP_MESSAGES } from './constants/http.constants';
import {
  loginValidator,
  characterQueryValidator,
  sessionQueryValidator,
  historyQueryValidator,
  logQueryValidator,
} from './validators/api.validators';

const app = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

app.use(logger());
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const end = Date.now();
  const logger = new Logger(c.env.CHARACTER_LOGS);
  await logger.log('Index', `${c.req.method} ${c.req.url} - ${end - start}ms`);
});

// Error handler with better error messages
const errorHandler = async (
  c: CloudflareBindings,
  error: Error,
  message: string,
): Promise<ApiResponse<never>> => {
  const logger = new Logger(c.CHARACTER_LOGS);
  await logger.error(`${message}:`, error.message);
  return {
    success: false,
    error: HTTP_MESSAGES.INTERNAL_ERROR,
    message: `${message}: ${error.message}`,
  };
};

app.get('/', async c => {
  return c.json<ApiResponse<string>>({
    success: true,
    data: 'Hello Hono!',
  });
});

app.post('/auth/login', zValidator('json', loginValidator), async c => {
  try {
    const { email, password } = c.req.valid('json');
    const prisma = await prismaClients.fetch(c.env.DB);
    const authService = new AuthService(c.env, prisma);

    const token = await authService.login(email, password);
    if (!token) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: HTTP_MESSAGES.INVALID_CREDENTIALS,
        },
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    return c.json<ApiResponse<{ token: string }>>({
      success: true,
      data: { token },
      message: HTTP_MESSAGES.LOGIN_SUCCESS,
    });
  } catch (error) {
    return c.json(
      errorHandler(c.env, error as Error, 'Login error'),
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
});

app.get('/ws', authMiddleware([UserType.User, UserType.Admin]), async c => {
  try {
    if (c.req.header('upgrade') !== 'websocket') {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Expected WebSocket upgrade',
          message: HTTP_MESSAGES.WEBSOCKET_REQUIRED,
        },
        HTTP_STATUS.UPGRADE_REQUIRED,
      );
    }

    const user = c.get('user');
    const id = c.env.CHARACTER_OBJECT.idFromName(user.id);
    const stub = c.env.CHARACTER_OBJECT.get(id);

    return stub.fetch(c.req.raw);
  } catch (error) {
    return c.json<ApiResponse<never>>(
      await errorHandler(c.env, error as Error, 'WebSocket connection error'),
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
});

app.get(
  '/admin/character',
  authMiddleware([UserType.Admin]),
  zValidator('query', characterQueryValidator),
  async c => {
    try {
      const { userId, isActive } = c.req.valid('query');
      const stub = c.env.CHARACTER_OBJECT.get(c.env.CHARACTER_OBJECT.idFromName(userId));

      const characters = await stub.getCharactersByProperty('isActive', isActive === 'true');
      return c.json<ApiResponse<typeof characters>>({
        success: true,
        data: characters,
      });
    } catch (error) {
      return c.json(
        errorHandler(c.env, error as Error, 'Error fetching characters'),
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }
  },
);

app.get(
  '/admin/session',
  authMiddleware([UserType.Admin]),
  zValidator('query', sessionQueryValidator),
  async c => {
    try {
      const { userId } = c.req.valid('query');
      const id = c.env.CHARACTER_OBJECT.idFromName(userId);
      const stub = c.env.CHARACTER_OBJECT.get(id);

      const sessions = await stub.getSessionConnections();
      return c.json<ApiResponse<typeof sessions>>({
        success: true,
        data: sessions,
      });
    } catch (error) {
      return c.json<ApiResponse<never>>(
        await errorHandler(c.env, error as Error, 'Error fetching sessions'),
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }
  },
);

app.get(
  '/admin/history',
  authMiddleware([UserType.Admin]),
  zValidator('query', historyQueryValidator),
  async c => {
    try {
      const { characterId } = c.req.valid('query');
      const characterHistory = new CharacterHistory(c.env.CHARACTER_HISTORY);
      const history = await characterHistory.getHistoryById(characterId);
      return c.json<ApiResponse<typeof history>>({
        success: true,
        data: history,
      });
    } catch (error) {
      return c.json<ApiResponse<never>>(
        await errorHandler(c.env, error as Error, 'Error fetching character history'),
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }
  },
);

app.get(
  '/admin/log',
  authMiddleware([UserType.Admin]),
  zValidator('query', logQueryValidator),
  async c => {
    try {
      const { className, startTime, endTime } = c.req.valid('query');
      const logger = new Logger(c.env.CHARACTER_LOGS);
      const logs = await logger.getLogs(className, new Date(startTime), new Date(endTime));
      return c.json<ApiResponse<typeof logs>>({
        success: true,
        data: logs,
      });
    } catch (error) {
      return c.json<ApiResponse<never>>(
        await errorHandler(c.env, error as Error, 'Error fetching logs'),
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }
  },
);

export { CharacterObject } from './durable/character/character-object';
export default app;
