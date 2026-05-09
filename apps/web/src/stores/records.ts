import { defineStore } from 'pinia';

export type RecordKind = 'memo' | 'photo' | 'audio' | 'transcript' | 'daily_report' | 'monthly_report';

export type PhotoAttachment = {
  id: string;
  recordId: string | null;
  relativePath: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  caption: string;
  previewUrl: string;
  createdAt: string;
  updatedAt: string;
};

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
  ownerUserId: string;
  attachments: PhotoAttachment[];
  createdAt: string;
  updatedAt: string;
};

export type RecordSearchParams = {
  keyword?: string;
  targetDate?: string;
  kind?: string;
};

export type CreatePhotoRecordInput = {
  targetDate: string;
  title?: string;
  caption?: string;
  imageFile: File;
};

type RecordState = {
  records: RecordItem[];
  loading: boolean;
  saving: boolean;
  error: string | null;
};

export const useRecordsStore = defineStore('records', {
  state: (): RecordState => ({
    records: [],
    loading: false,
    saving: false,
    error: null
  }),
  actions: {
    async fetchRecords(params: RecordSearchParams = {}) {
      this.loading = true;
      this.error = null;

      try {
        const searchParams = new URLSearchParams();

        for (const [key, value] of Object.entries(params)) {
          if (value) {
            searchParams.set(key, value);
          }
        }

        const query = searchParams.toString();
        const response = await fetch(`/api/records${query ? `?${query}` : ''}`);

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

    async createPhotoRecord(input: CreatePhotoRecordInput) {
      const formData = new FormData();
      formData.set('targetDate', input.targetDate);
      formData.set('imageFile', input.imageFile);

      if (input.title) {
        formData.set('title', input.title);
      }

      if (input.caption) {
        formData.set('caption', input.caption);
      }

      await this.sendMutation('/api/records/photo', {
        method: 'POST',
        body: formData
      });
    },

    async attachPhoto(recordId: string, imageFile: File, caption: string) {
      const formData = new FormData();
      formData.set('imageFile', imageFile);

      if (caption) {
        formData.set('caption', caption);
      }

      await this.sendMutation(`/api/records/${recordId}/attachments`, {
        method: 'POST',
        body: formData
      });
    },

    async updatePhotoCaption(attachmentId: string, caption: string) {
      await this.sendMutation(`/api/attachments/${attachmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ caption })
      });
    },

    async deletePhotoAttachment(attachmentId: string, deleteMode: 'detach_only' | 'delete_file') {
      await this.sendMutation(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deleteMode })
      });
    },

    async sendMutation(url: string, init: RequestInit) {
      this.saving = true;
      this.error = null;

      try {
        const response = await fetch(url, init);

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(data.message ?? '写真を保存できませんでした');
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : '写真を保存できませんでした';
        throw error;
      } finally {
        this.saving = false;
      }
    }
  }
});
