import cors from 'cors';
import express from 'express';
import type { SqliteConnection } from '../../infrastructure/database/sqlite/connection.js';
import { SqliteRecordRepository } from '../../infrastructure/repositories/sqliteRecordRepository.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createAttachmentRouter } from './routes/attachmentRoutes.js';
import { createHealthRouter } from './routes/healthRoutes.js';
import { createRecordRouter } from './routes/recordRoutes.js';

type AppDependencies = {
  db: SqliteConnection;
  dataDir?: string;
};

export function createApp(deps: AppDependencies): express.Express {
  const app = express();
  const recordRepository = new SqliteRecordRepository(deps.db);
  const dataDir = deps.dataDir ?? process.env.DATA_DIR ?? 'data';

  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  app.use('/health', createHealthRouter());
  app.use('/api/records', createRecordRouter(recordRepository, recordRepository, dataDir));
  app.use('/api/attachments', createAttachmentRouter(recordRepository, recordRepository, dataDir));

  app.use(errorHandler);

  return app;
}
