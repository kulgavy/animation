import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { Logger } from './logger';

describe('Logger', () => {
  let mockKV: KVNamespace;
  let logger: Logger;
  let putMock: ReturnType<typeof mock>;
  let getMock: ReturnType<typeof mock>;
  let listMock: ReturnType<typeof mock>;

  beforeEach(() => {
    putMock = mock(() => Promise.resolve());
    getMock = mock(() => Promise.resolve('Log entry'));
    listMock = mock(() =>
      Promise.resolve({
        keys: [
          { name: 'TestClass-1704067200000', metadata: null },
          { name: 'TestClass-1704110400000', metadata: null },
          { name: 'TestClass-1704153599999', metadata: null },
        ],
        list_complete: true,
        cacheStatus: null,
      }),
    );

    mockKV = {
      put: putMock,
      get: getMock,
      list: listMock,
    } as unknown as KVNamespace;

    logger = new Logger(mockKV);
  });

  describe('log', () => {
    it('should log info message with correct format and store in KV', async () => {
      const className = 'TestClass';
      const message = 'Test message';
      const level = 'info';

      // Mock Date
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      const originalDate = global.Date;
      global.Date = class extends Date {
        constructor() {
          super();
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      } as unknown as DateConstructor;

      const consoleWarnSpy = mock(console.warn);
      console.warn = consoleWarnSpy;

      await logger.log(className, message, level);

      // Verify console.warn was called with correct format
      expect(consoleWarnSpy.mock.calls[0][0]).toBe(
        `[2024-01-01T12:00:00.000Z] [INFO] Test message`,
      );

      // Verify KV.put was called with correct arguments
      expect(putMock.mock.calls[0]).toEqual([
        `${className}-${mockDate.getTime()}`,
        `[2024-01-01T12:00:00.000Z] [INFO] Test message`,
      ]);

      // Restore original Date and console.warn
      global.Date = originalDate;
      console.warn = originalDate;
    });

    it('should log error message with correct format and store in KV', async () => {
      const className = 'TestClass';
      const message = 'Error message';
      const level = 'error';

      // Mock Date
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      const originalDate = global.Date;
      global.Date = class extends Date {
        constructor() {
          super();
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      } as unknown as DateConstructor;

      const consoleErrorSpy = mock(console.error);
      console.error = consoleErrorSpy;

      await logger.log(className, message, level);

      // Verify console.error was called with correct format
      expect(consoleErrorSpy.mock.calls[0][0]).toBe(
        `[2024-01-01T12:00:00.000Z] [ERROR] Error message`,
      );

      // Verify KV.put was called with correct arguments
      expect(putMock.mock.calls[0]).toEqual([
        `${className}-${mockDate.getTime()}`,
        `[2024-01-01T12:00:00.000Z] [ERROR] Error message`,
      ]);

      // Restore original Date and console.error
      global.Date = originalDate;
      console.error = originalDate;
    });
  });

  describe('error', () => {
    it('should log error message with correct level', async () => {
      const className = 'TestClass';
      const message = 'Error message';

      const mockLog = mock<typeof logger.log>(() => Promise.resolve());
      const originalLog = logger.log;
      logger.log = mockLog;

      await logger.error(className, message);

      expect(mockLog.mock.calls[0]).toEqual([className, message, 'error']);

      // Restore original method
      logger.log = originalLog;
    });
  });

  describe('getLogs', () => {
    it('should return filtered and sorted logs within time range', async () => {
      const className = 'TestClass';
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T23:59:59.999Z');

      const logs = await logger.getLogs(className, startTime, endTime);

      expect(listMock.mock.calls[0][0]).toEqual({ prefix: className, limit: 500 });
      expect(logs.length).toBe(3);
    });

    it('should filter out logs outside time range', async () => {
      const className = 'TestClass';
      const startTime = new Date('2024-01-01T12:00:00.000Z');
      const endTime = new Date('2024-01-01T14:00:00.000Z');

      const logs = await logger.getLogs(className, startTime, endTime);

      expect(logs.length).toBe(1);
    });
  });
});
