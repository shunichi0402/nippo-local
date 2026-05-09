import { defineStore } from 'pinia';

export type RecordKind = 'memo' | 'photo' | 'audio' | 'transcript' | 'daily_report' | 'monthly_report';

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
  createdAt: string;
  updatedAt: string;
};

export type RecordPayload = {
  targetDate: string;
  title: string;
  body: string;
  tags: string[];
  category: string | null;
  project: string | null;
};

export type RecordQuery = {
  keyword?: string;
  targetDate?: string;
  kind?: RecordKind;
  tag?: string;
};

export type FieldErrors = Record<string, string[]>;

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

        Object.entries(query).forEach(([key, value]) => {
          if (value) {
            params.set(key, value);
          }
        });

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
    async createRecord(payload: RecordPayload) {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw await parseApiError(response, 'メモを保存できませんでした');
      }

      const data = (await response.json()) as { record: RecordItem };
      this.records = [data.record, ...this.records];

      return data.record;
    },
    async updateRecord(id: string, payload: RecordPayload) {
      const response = await fetch(`/api/records/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw await parseApiError(response, 'メモを更新できませんでした');
      }

      const data = (await response.json()) as { record: RecordItem };
      this.records = this.records.map((record) => (record.id === id ? data.record : record));

      return data.record;
    },
    async deleteRecord(id: string) {
      const previous = this.records;
      this.records = this.records.filter((record) => record.id !== id);

      try {
        const response = await fetch(`/api/records/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw await parseApiError(response, 'メモを削除できませんでした');
        }
      } catch (error) {
        this.records = previous;
        throw error;
      }
    }
  }
});

export class ApiValidationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: FieldErrors
  ) {
    super(message);
    this.name = 'ApiValidationError';
  }
}

async function parseApiError(response: Response, fallbackMessage: string): Promise<Error> {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
    fieldErrors?: FieldErrors;
  } | null;

  if (data?.error === 'validation_error') {
    return new ApiValidationError(fallbackMessage, data.fieldErrors ?? {});
  }

  return new Error(fallbackMessage);
}
