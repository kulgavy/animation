import { verify } from 'hono/jwt';
import { createMiddleware } from 'hono/factory';
import { Variables } from '../../types/basic-type';
import { UserPayload } from './type';
import { SIGNATURE_ALGORITHM } from '../../auth/constant';
import { UserType } from '../../user/constant';

// Modify the middleware to accept a required role
export const authMiddleware = (userTypes: UserType[]) =>
  createMiddleware<{ Variables: Variables; Bindings: CloudflareBindings }>(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.text('Unauthorized', 401);
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = (await verify(token, c.env.JWT_SECRET, SIGNATURE_ALGORITHM)) as UserPayload;

      // Attach user info to context for later use
      const userPayload: UserPayload = {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        type: payload.type,
      };
      c.set('user', userPayload);

      if (!userTypes.includes(userPayload.type)) {
        return c.text('Forbidden: Insufficient Role', 403);
      }

      await next();
    } catch {
      return c.text('Invalid or Expired Token', 401);
    }
  });
