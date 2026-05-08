import { defineStore } from 'pinia';

export type RecordKind = 'memo' | 'photo' | 'audio' | 'transcript' | 'daily_report' | 'monthly_report';

export type RecordItem = {
  id: string;
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
    async fetchRecords() {
      this.loading = true;
      this.error = null;

      try {
        const response = await fetch('/api/records');

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
    }
  }
});

