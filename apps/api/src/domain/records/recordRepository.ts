import type { NewRecord, RecordItem } from './record.js';

export type RecordSort = 'targetDate_desc' | 'targetDate_asc' | 'updatedAt_desc';

export type RecordSearchQuery = {
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  tags?: string[];
  types?: string[];
  sort: RecordSort;
  page: number;
  pageSize: number;
};

export type RecordSearchResult = {
  items: RecordItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export interface RecordRepository {
  create(record: NewRecord): RecordItem;
  list(query: RecordSearchQuery): RecordSearchResult;
  findById(id: string): RecordItem | null;
}
