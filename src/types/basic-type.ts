import { UserPayload } from '../middleware/auth/type';

export type Variables = {
  user: UserPayload;
};

export type Nullable<T> = T | null | undefined;

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};
