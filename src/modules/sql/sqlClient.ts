import sql from 'mssql';
import { getSqlConnectionString } from '../config/config';
import { logError } from '../logging/logger';

let cachedPool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (cachedPool && cachedPool.connected) {
    return cachedPool;
  }

  if (cachedPool) {
    await cachedPool.close().catch(() => undefined);
    cachedPool = null;
  }

  const connectionString = await getSqlConnectionString();
  cachedPool = await sql.connect(connectionString);
  return cachedPool;
}

export async function closePool(): Promise<void> {
  if (cachedPool) {
    await cachedPool.close().catch((error: unknown) => {
      logError('SqlPoolCloseFailed', error);
    });
    cachedPool = null;
  }
}

export { sql };
