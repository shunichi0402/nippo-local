import Database from 'better-sqlite3';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { runMigrations } from '../src/infrastructure/database/sqlite/migrate.js';
import { createApp } from '../src/presentation/http/app.js';

describe('health', () => {
  it('returns ok', async () => {
    const db = new Database(':memory:');
    runMigrations(db);

    await request(createApp({ db }))
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ status: 'ok' });
      });
  });
});

