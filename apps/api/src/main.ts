import { createApp } from './presentation/http/app.js';
import { getEnv } from './infrastructure/config/env.js';
import { createSqliteConnection } from './infrastructure/database/sqlite/connection.js';
import { runMigrations } from './infrastructure/database/sqlite/migrate.js';

const env = getEnv();
const db = createSqliteConnection(env.dataDir);

runMigrations(db);

const app = createApp({ db, dataDir: env.dataDir });

app.listen(env.port, env.host, () => {
  console.log(`API listening on http://${env.host}:${env.port}`);
});
