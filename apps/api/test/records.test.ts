import Database from 'better-sqlite3';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { runMigrations } from '../src/infrastructure/database/sqlite/migrate.js';
import { createApp } from '../src/presentation/http/app.js';

function createTestApp() {
  const db = new Database(':memory:');
  runMigrations(db);
  return createApp({ db });
}

describe('records', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(async () => {
    app = createTestApp();

    for (let index = 1; index <= 30; index += 1) {
      await request(app)
        .post('/api/records')
        .send({
          targetDate: `2026-05-${String(index).padStart(2, '0')}`,
          title: `作業メモ ${index}`,
          body: index === 10 ? '検索対象の本文 alpha' : `定例作業 ${index}`,
          kind: index % 2 === 0 ? 'memo' : 'daily_report',
          tags: index === 10 ? ['work', 'urgent'] : ['work'],
          transcript: index === 11 ? '会議の文字起こし beta' : null
        })
        .expect(201);
    }

    await request(app)
      .post('/api/records')
      .send({
        targetDate: '2026-05-12',
        title: '現場写真',
        body: '写真キャプション gamma',
        kind: 'photo',
        tags: ['photo', 'urgent']
      })
      .expect(201);
  });

  it('filters by date range, tags, types, and keyword with pagination metadata', async () => {
    await request(app)
      .get('/api/records')
      .query({
        fromDate: '2026-05-01',
        toDate: '2026-05-20',
        tags: ['work', 'urgent'],
        types: ['memo'],
        keyword: 'alpha',
        sort: 'targetDate_asc',
        page: 1,
        pageSize: 5
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.totalCount).toBe(1);
        expect(body.page).toBe(1);
        expect(body.pageSize).toBe(5);
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({
          targetDate: '2026-05-10',
          kind: 'memo',
          tags: ['work', 'urgent']
        });
        expect(body.records).toEqual(body.items);
      });
  });

  it('searches photo captions and transcripts', async () => {
    await request(app)
      .get('/api/records')
      .query({ keyword: 'gamma', types: ['photo'] })
      .expect(200)
      .expect(({ body }) => {
        expect(body.totalCount).toBe(1);
        expect(body.items[0].title).toBe('現場写真');
      });

    await request(app)
      .get('/api/records')
      .query({ keyword: 'beta' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.totalCount).toBe(1);
        expect(body.items[0].transcript).toBe('会議の文字起こし beta');
      });
  });

  it('returns paged results in the requested order', async () => {
    await request(app)
      .get('/api/records')
      .query({ page: 2, pageSize: 10, sort: 'targetDate_asc' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.totalCount).toBe(31);
        expect(body.items).toHaveLength(10);
        expect(body.items[0].targetDate).toBe('2026-05-11');
      });
  });

  it('opens a record detail from the search result id', async () => {
    const listResponse = await request(app).get('/api/records').query({ keyword: 'alpha' }).expect(200);
    const id = listResponse.body.items[0].id as string;

    await request(app)
      .get(`/api/records/${id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.record.id).toBe(id);
        expect(body.record.body).toContain('alpha');
      });
  });

  it('returns validation reasons for invalid search conditions', async () => {
    await request(app)
      .get('/api/records')
      .query({ fromDate: '2026-05-20', toDate: '2026-05-01' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error).toBe('validation_error');
        expect(body.issues[0].message).toContain('fromDate');
      });

    await request(app)
      .get('/api/records')
      .query({ keyword: '   ' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.issues[0].message).toContain('keyword');
      });

    await request(app)
      .get('/api/records')
      .query({ types: ['unknown'] })
      .expect(400);

    await request(app)
      .get('/api/records')
      .query({ pageSize: 101 })
      .expect(400);
  });
});
