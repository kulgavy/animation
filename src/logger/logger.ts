export class Logger {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async log(className: string, message: string, level: 'info' | 'error' = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // Console log based on level
    if (level === 'error') {
      console.error(logMessage);
    } else {
      console.warn(logMessage);
    }

    // Store in KV with timestamp-based key
    const kvKey = `${className}-${Date.now()}`;
    await this.kv.put(kvKey, logMessage);
  }

  async error(key: string, message: string) {
    await this.log(key, message, 'error');
  }

  async getLogs(className: string, startTime: Date, endTime: Date): Promise<string[]> {
    const logs: string[] = [];
    const startTimeMs = startTime.getTime();
    const endTimeMs = endTime.getTime();

    // List all keys with the class name prefix
    const { keys } = await this.kv.list({ prefix: className, limit: 500 });

    for (const key of keys) {
      // Extract timestamp from key
      const timestamp = parseInt(key.name.split('-')[1]);

      // Check if log is within the time range
      if (timestamp >= startTimeMs && timestamp <= endTimeMs) {
        const log = await this.kv.get(key.name);
        if (log) {
          logs.push(log);
        }
      }
    }

    // Sort logs by timestamp
    return logs.sort();
  }
}
