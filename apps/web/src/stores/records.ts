import { defineStore } from 'pinia';

export type RecordKind = 'memo' | 'photo' | 'audio' | 'transcript' | 'daily_report' | 'monthly_report';
export type TranscriptMethod = 'manual' | 'local_model' | 'external_api';

export type AudioAttachment = {
  id: string;
  recordId: string;
  storagePath: string;
  fileName: string;
  originalFileName: string | null;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  transcriptId: string | null;
  transcriptText: string | null;
  transcriptMethod: TranscriptMethod | null;
  transcriptCreatedAt: string | null;
  transcriptUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecordItem = {
  id: string;
  ownerUserId: string;
  targetDate: string;
  title: string;
  body: string;
  kind: RecordKind;
  tags: string[];
  category: string | null;
  project: string | null;
  transcript: string | null;
  transcriptMethod: TranscriptMethod | null;
  audioAttachments: AudioAttachment[];
  createdAt: string;
  updatedAt: string;
};

export type RecordQuery = {
  keyword?: string;
  targetDate?: string;
  kind?: string;
};

export type AudioSaveInput = {
  authUserId: string;
  recordId?: string;
  targetDate?: string;
  title?: string;
  audioData: string;
  originalFileName?: string;
  mimeType?: string;
  durationSeconds?: number;
  transcriptText?: string;
  transcriptMethod?: TranscriptMethod;
};

type RecordState = {
  records: RecordItem[];
  loading: boolean;
  error: string | null;
};

export const useRecordsStore = defineStore('records', {
  state: (): RecordState => ({
    records: [],
    loading: false,
    error: null
  }),
  actions: {
    async fetchRecords(query: RecordQuery = {}) {
      this.loading = true;
      this.error = null;

      try {
        const params = new URLSearchParams();

        for (const [key, value] of Object.entries(query)) {
          if (value) {
            params.set(key, value);
          }
        }

        const response = await fetch(`/api/records${params.size > 0 ? `?${params.toString()}` : ''}`);

        if (!response.ok) {
          throw new Error('記録を取得できませんでした');
        }

        const data = (await response.json()) as { records: RecordItem[] };
        this.records = data.records;
      } catch (error) {
        this.error = error instanceof Error ? error.message : '記録を取得できませんでした';
      } finally {
        this.loading = false;
      }
    },
    async startRecording(authUserId: string) {
      const response = await fetch('/api/audio/recording/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authUserId })
      });

      await ensureOk(response, '録音を開始できませんでした');
      return (await response.json()) as { recording: { id: string; startedAt: string } };
    },
    async stopRecording(input: AudioSaveInput) {
      await this.saveAudio('/api/audio/recording/stop', input, '録音を保存できませんでした');
    },
    async uploadAudio(input: AudioSaveInput) {
      await this.saveAudio('/api/audio/upload', input, '音声を取り込めませんでした');
    },
    async updateTranscript(input: {
      authUserId: string;
      recordId: string;
      attachmentId: string;
      transcriptText: string;
      transcriptMethod: TranscriptMethod;
    }) {
      const response = await fetch(
        `/api/audio/records/${input.recordId}/attachments/${input.attachmentId}/transcript`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authUserId: input.authUserId,
            transcriptText: input.transcriptText,
            transcriptMethod: input.transcriptMethod
          })
        }
      );

      await ensureOk(response, '文字起こしを保存できませんでした');
      await this.fetchRecords();
    },
    async saveAudio(endpoint: string, input: AudioSaveInput, fallbackMessage: string) {
      this.loading = true;
      this.error = null;

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        });

        await ensureOk(response, fallbackMessage);
        await this.fetchRecords();
      } catch (error) {
        this.error = error instanceof Error ? error.message : fallbackMessage;
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
});

async function ensureOk(response: Response, fallbackMessage: string): Promise<void> {
  if (response.ok) {
    return;
  }

  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  throw new Error(data?.message ?? fallbackMessage);
}
