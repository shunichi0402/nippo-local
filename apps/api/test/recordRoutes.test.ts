import Database from 'better-sqlite3';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { runMigrations } from '../src/infrastructure/database/sqlite/migrate.js';
import { createApp } from '../src/presentation/http/app.js';

const validRecord = {
  targetDate: '2026-05-09',
  title: '朝のメモ',
  body: '検索と日報に使うメモ',
  tags: ['report', 'report', 'api'],
  category: 'work',
  project: 'nippo-local'
};

describe('record routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    const db = new Database(':memory:');
    runMigrations(db);
    app = createApp({ db });
  });

  it('creates a memo with metadata and deduplicated tags', async () => {
    await request(app)
      .post('/api/records')
      .send(validRecord)
      .expect(201)
      .expect(({ body }) => {
        expect(body.record).toMatchObject({
          ownerUserId: 'local-user',
          targetDate: '2026-05-09',
          title: '朝のメモ',
          body: '検索と日報に使うメモ',
          tags: ['report', 'api'],
          category: 'work',
          project: 'nippo-local'
        });
      });
  });

  it('returns field errors for invalid create input', async () => {
    await request(app)
      .post('/api/records')
      .send({
        targetDate: '2026-99-99',
        title: 'x'.repeat(121),
        body: '',
        tags: ['valid', '', 'x'.repeat(31)],
        category: 'x'.repeat(31),
        project: 'x'.repeat(51)
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error).toBe('validation_error');
        expect(body.fieldErrors).toMatchObject({
          targetDate: expect.any(Array),
          title: expect.any(Array),
          body: expect.any(Array),
          tags: expect.any(Array),
          category: expect.any(Array),
          project: expect.any(Array)
        });
      });
  });

  it('updates memo content and metadata', async () => {
    const created = await request(app).post('/api/records').send(validRecord).expect(201);
    const id = created.body.record.id as string;

    await request(app)
      .put(`/api/records/${id}`)
      .send({
        targetDate: '2026-05-10',
        title: '',
        body: '更新した本文',
        tags: ['updated'],
        category: '',
        project: 'project-b'
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.record).toMatchObject({
          id,
          targetDate: '2026-05-10',
          title: '',
          body: '更新した本文',
          tags: ['updated'],
          category: null,
          project: 'project-b'
        });
      });
  });

  it('deletes a memo and removes it from list and keyword search', async () => {
    const created = await request(app)
      .post('/api/records')
      .send({ ...validRecord, body: 'delete-keyword body' })
      .expect(201);
    const id = created.body.record.id as string;

    await request(app).delete(`/api/records/${id}`).expect(204);

    await request(app)
      .get('/api/records')
      .expect(200)
      .expect(({ body }) => {
        expect(body.records).toHaveLength(0);
      });

    await request(app)
      .get('/api/records')
      .query({ keyword: 'delete-keyword' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.records).toHaveLength(0);
      });
  });

  it('rejects updates and deletes by a different owner', async () => {
    const created = await request(app)
      .post('/api/records')
      .set('x-user-id', 'user-a')
      .send(validRecord)
      .expect(201);
    const id = created.body.record.id as string;

    await request(app).put(`/api/records/${id}`).set('x-user-id', 'user-b').send(validRecord).expect(403);
    await request(app).delete(`/api/records/${id}`).set('x-user-id', 'user-b').expect(403);
  });
});
