import type { NewRecord, RecordItem, UpdateRecord } from './record.js';

export type RecordSearchQuery = {
  keyword?: string;
  targetDate?: string;
  kind?: string;
  tag?: string;
};

export interface RecordRepository {
  create(record: NewRecord): RecordItem;
  list(query?: RecordSearchQuery): RecordItem[];
  findById(id: string): RecordItem | null;
  update(id: string, record: UpdateRecord): RecordItem | null;
  delete(id: string): boolean;
}
