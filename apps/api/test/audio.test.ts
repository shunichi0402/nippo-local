import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runMigrations } from '../src/infrastructure/database/sqlite/migrate.js';
import { createApp } from '../src/presentation/http/app.js';

describe('audio records', () => {
  let dataDir: string;
  let db: Database.Database;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nippo-audio-test-'));
    db = new Database(':memory:');
    runMigrations(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('creates a standalone audio record with a UUID v7 attachment filename and searchable transcript', async () => {
    const app = createApp({ db, dataDir });
    const audioData = Buffer.from('fake webm audio').toString('base64');

    const createResponse = await request(app)
      .post('/api/audio/upload')
      .send({
        authUserId: 'user-a',
        targetDate: '2026-05-09',
        title: '外部音声',
        audioData,
        originalFileName: 'meeting.webm',
        mimeType: 'audio/webm',
        transcriptText: '検索できる文字起こしテキスト',
        transcriptMethod: 'manual'
      })
      .expect(201);

    expect(createResponse.body.record.kind).toBe('audio');
    expect(createResponse.body.record.ownerUserId).toBe('user-a');
    expect(createResponse.body.attachment.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(createResponse.body.attachment.fileName).toBe(`${createResponse.body.attachment.id}.webm`);
    expect(createResponse.body.attachment.originalFileName).toBe('meeting.webm');
    expect(fs.existsSync(path.join(dataDir, createResponse.body.attachment.storagePath))).toBe(true);

    const searchResponse = await request(app).get('/api/records').query({ keyword: 'テキスト' }).expect(200);

    expect(searchResponse.body.records).toHaveLength(1);
    expect(searchResponse.body.records[0].transcript).toContain('文字起こしテキスト');
    expect(searchResponse.body.records[0].transcriptMethod).toBe('manual');
  });

  it('rejects audio attachment and transcript updates for records owned by another user', async () => {
    const app = createApp({ db, dataDir });
    const createRecordResponse = await request(app)
      .post('/api/records')
      .send({
        authUserId: 'owner',
        targetDate: '2026-05-09',
        title: '所有者の記録',
        body: 'body'
      })
      .expect(201);

    await request(app)
      .post('/api/audio/upload')
      .send({
        authUserId: 'other-user',
        recordId: createRecordResponse.body.record.id,
        audioData: Buffer.from('fake wav audio').toString('base64'),
        originalFileName: 'memo.wav',
        mimeType: 'audio/wav'
      })
      .expect(403);

    const ownerAttachResponse = await request(app)
      .post('/api/audio/upload')
      .send({
        authUserId: 'owner',
        recordId: createRecordResponse.body.record.id,
        audioData: Buffer.from('fake wav audio').toString('base64'),
        originalFileName: 'memo.wav',
        mimeType: 'audio/wav'
      })
      .expect(201);

    await request(app)
      .put(
        `/api/audio/records/${createRecordResponse.body.record.id}/attachments/${ownerAttachResponse.body.attachment.id}/transcript`
      )
      .send({
        authUserId: 'other-user',
        transcriptText: '更新できない',
        transcriptMethod: 'manual'
      })
      .expect(403);
  });

  it('rejects duplicate recording starts and stopping without audio data', async () => {
    const app = createApp({ db, dataDir });

    await request(app).post('/api/audio/recording/start').send({ authUserId: 'recorder' }).expect(201);
    await request(app).post('/api/audio/recording/start').send({ authUserId: 'recorder' }).expect(409);
    await request(app)
      .post('/api/audio/recording/stop')
      .send({ authUserId: 'recorder', targetDate: '2026-05-09', audioData: '', mimeType: 'audio/webm' })
      .expect(400);
  });
});
