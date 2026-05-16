import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'juiceops',
    password: process.env.DB_PASSWORD || 'JuiceOps2024!',
    database: process.env.DB_NAME || 'juiceops',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    decimalNumbers: true,  // DECIMAL → number (pas string)
  });
}

// Singleton pool to survive Next.js hot reloads in dev
export const pool: mysql.Pool =
  globalThis._mysqlPool ?? (globalThis._mysqlPool = createPool());
