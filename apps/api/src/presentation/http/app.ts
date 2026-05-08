import cors from 'cors';
import express from 'express';
import type { SqliteConnection } from '../../infrastructure/database/sqlite/connection.js';
import { SqliteRecordRepository } from '../../infrastructure/repositories/sqliteRecordRepository.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createHealthRouter } from './routes/healthRoutes.js';
import { createRecordRouter } from './routes/recordRoutes.js';

type AppDependencies = {
  db: SqliteConnection;
};

export function createApp(deps: AppDependencies): express.Express {
  const app = express();
  const recordRepository = new SqliteRecordRepository(deps.db);

  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  app.use('/health', createHealthRouter());
  app.use('/api/records', createRecordRouter(recordRepository));

  app.use(errorHandler);

  return app;
}

