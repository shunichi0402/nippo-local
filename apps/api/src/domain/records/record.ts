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

export type NewRecord = {
  targetDate: string;
  title: string;
  body?: string;
  kind?: RecordKind;
  tags?: string[];
  category?: string | null;
  project?: string | null;
  transcript?: string | null;
};

