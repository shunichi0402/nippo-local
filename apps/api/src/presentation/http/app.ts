import cors from 'cors';
import express from 'express';
import path from 'node:path';
import type { SqliteConnection } from '../../infrastructure/database/sqlite/connection.js';
import { getEnv } from '../../infrastructure/config/env.js';
import { SqliteRecordRepository } from '../../infrastructure/repositories/sqliteRecordRepository.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createAudioRouter } from './routes/audioRoutes.js';
import { createHealthRouter } from './routes/healthRoutes.js';
import { createRecordRouter } from './routes/recordRoutes.js';

type AppDependencies = {
  db: SqliteConnection;
  dataDir?: string;
};

export function createApp(deps: AppDependencies): express.Express {
  const app = express();
  const recordRepository = new SqliteRecordRepository(deps.db);
  const dataDir = deps.dataDir ?? getEnv().dataDir;

  app.use(cors());
  app.use(express.json({ limit: '150mb' }));
  app.use('/media/audio', express.static(path.join(dataDir, 'audio')));

  app.use('/health', createHealthRouter());
  app.use('/api/records', createRecordRouter(recordRepository));
  app.use('/api/audio', createAudioRouter(recordRepository, dataDir));

  app.use(errorHandler);

  return app;
}
