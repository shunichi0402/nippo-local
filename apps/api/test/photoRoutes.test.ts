import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { maxPhotoSizeBytes } from '../src/infrastructure/storage/photoStorage.js';
import { runMigrations } from '../src/infrastructure/database/sqlite/migrate.js';
import { createApp } from '../src/presentation/http/app.js';

const pngBuffer = Buffer.from('fake-png-content');

describe('photo routes', () => {
  let dataDir: string;
  let db: Database.Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nippo-photo-test-'));
    db = new Database(':memory:');
    runMigrations(db);
    app = createApp({ db, dataDir });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(dataDir, { force: true, recursive: true });
  });

  it('creates a photo-only record with UUID v7 attachment metadata and a saved file', async () => {
    const response = await request(app)
      .post('/api/records/photo')
      .field('targetDate', '2026-05-09')
      .field('title', '現場写真')
      .field('caption', '配線の状態')
      .attach('imageFile', pngBuffer, { filename: 'photo.png', contentType: 'image/png' })
      .expect(201);

    expect(response.body.record.kind).toBe('photo');
    expect(response.body.record.attachments).toHaveLength(1);
    expect(response.body.attachment.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(response.body.attachment.fileName).toBe(`${response.body.attachment.id}.png`);
    expect(response.body.attachment.originalName).toBe('photo.png');
    expect(response.body.attachment.caption).toBe('配線の状態');
    expect(fs.existsSync(path.join(dataDir, response.body.attachment.relativePath))).toBe(true);
  });

  it('attaches a valid photo to an existing record and includes captions in search', async () => {
    const createRecordResponse = await request(app)
      .post('/api/records')
      .send({
        targetDate: '2026-05-09',
        title: '打ち合わせ',
        body: '本文'
      })
      .expect(201);

    const attachResponse = await request(app)
      .post(`/api/records/${createRecordResponse.body.record.id}/attachments`)
      .field('caption', '検索用キャプション')
      .attach('imageFile', pngBuffer, { filename: 'context.webp', contentType: 'image/webp' })
      .expect(201);

    expect(attachResponse.body.attachment.fileName).toBe(`${attachResponse.body.attachment.id}.webp`);

    const listResponse = await request(app).get('/api/records').query({ keyword: '検索用' }).expect(200);

    expect(listResponse.body.records).toHaveLength(1);
    expect(listResponse.body.records[0].attachments[0].caption).toBe('検索用キャプション');
  });

  it('updates captions and supports detach-only deletion without removing the file', async () => {
    const photoResponse = await createPhotoRecord(app);
    const attachment = photoResponse.body.attachment;

    const updateResponse = await request(app)
      .patch(`/api/attachments/${attachment.id}`)
      .send({ caption: '更新後キャプション' })
      .expect(200);

    expect(updateResponse.body.attachment.caption).toBe('更新後キャプション');

    const deleteResponse = await request(app)
      .delete(`/api/attachments/${attachment.id}`)
      .send({ deleteMode: 'detach_only' })
      .expect(200);

    expect(deleteResponse.body.attachment.recordId).toBeNull();
    expect(fs.existsSync(path.join(dataDir, attachment.relativePath))).toBe(true);
  });

  it('deletes metadata and the actual file with delete_file', async () => {
    const photoResponse = await createPhotoRecord(app);
    const attachment = photoResponse.body.attachment;

    await request(app).delete(`/api/attachments/${attachment.id}`).send({ deleteMode: 'delete_file' }).expect(200);

    expect(fs.existsSync(path.join(dataDir, attachment.relativePath))).toBe(false);
    await request(app).get(`/api/attachments/${attachment.id}/file`).expect(404);
  });

  it('rejects unsupported extensions, oversized files, missing records, and other users', async () => {
    await request(app)
      .post('/api/records/photo')
      .field('targetDate', '2026-05-09')
      .attach('imageFile', pngBuffer, { filename: 'photo.gif', contentType: 'image/gif' })
      .expect(400);

    await request(app)
      .post('/api/records/photo')
      .field('targetDate', '2026-05-09')
      .attach('imageFile', Buffer.alloc(maxPhotoSizeBytes + 1), {
        filename: 'large.png',
        contentType: 'image/png'
      })
      .expect(400);

    await request(app)
      .post('/api/records/missing-record/attachments')
      .field('caption', 'missing')
      .attach('imageFile', pngBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .expect(404);

    const ownerRecord = await request(app)
      .post('/api/records')
      .set('x-user-id', 'owner')
      .send({ targetDate: '2026-05-09', title: 'owner record' })
      .expect(201);

    await request(app)
      .post(`/api/records/${ownerRecord.body.record.id}/attachments`)
      .set('x-user-id', 'other')
      .attach('imageFile', pngBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .expect(403);
  });
});

async function createPhotoRecord(app: ReturnType<typeof createApp>) {
  return request(app)
    .post('/api/records/photo')
    .field('targetDate', '2026-05-09')
    .field('caption', '初期キャプション')
    .attach('imageFile', pngBuffer, { filename: 'photo.jpeg', contentType: 'image/jpeg' })
    .expect(201);
}
