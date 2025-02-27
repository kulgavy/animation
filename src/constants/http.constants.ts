export const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    UPGRADE_REQUIRED: 426,
    INTERNAL_SERVER_ERROR: 500,
} as const;

export const HTTP_MESSAGES = {
    WEBSOCKET_REQUIRED: 'This endpoint requires a WebSocket connection',
    INVALID_CREDENTIALS: 'Invalid credentials',
    INTERNAL_ERROR: 'Internal Server Error',
    LOGIN_SUCCESS: 'Login successful',
} as const; 