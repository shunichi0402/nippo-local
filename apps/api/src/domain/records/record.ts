export const recordKinds = [
  'memo',
  'photo',
  'audio',
  'transcript',
  'daily_report',
  'monthly_report'
] as const;

export type RecordKind = (typeof recordKinds)[number];

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

export type NewRecord = {
  ownerUserId?: string;
  targetDate: string;
  title: string;
  body?: string;
  kind?: RecordKind;
  tags?: string[];
  category?: string | null;
  project?: string | null;
  transcript?: string | null;
  transcriptMethod?: TranscriptMethod | null;
};

export const transcriptMethods = ['manual', 'local_model', 'external_api'] as const;

export type TranscriptMethod = (typeof transcriptMethods)[number];

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

export type NewAudioAttachment = {
  id: string;
  recordId: string;
  storagePath: string;
  fileName: string;
  originalFileName?: string | null;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number | null;
};

export type TranscriptUpdate = {
  recordId: string;
  attachmentId?: string;
  transcriptText: string;
  transcriptMethod: TranscriptMethod;
};
