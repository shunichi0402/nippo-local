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

export type RecordSort = 'targetDate_desc' | 'targetDate_asc' | 'updatedAt_desc';

export type RecordSearchFilters = {
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  tags?: string[];
  types?: RecordKind[];
  sort?: RecordSort;
  page?: number;
  pageSize?: number;
};

type RecordState = {
  records: RecordItem[];
  selectedRecord: RecordItem | null;
  totalCount: number;
  page: number;
  pageSize: number;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
};

export const useRecordsStore = defineStore('records', {
  state: (): RecordState => ({
    records: [],
    selectedRecord: null,
    totalCount: 0,
    page: 1,
    pageSize: 20,
    loading: false,
    detailLoading: false,
    error: null
  }),
  actions: {
    async fetchRecords(filters: RecordSearchFilters = {}) {
      this.loading = true;
      this.error = null;

      try {
        const params = toSearchParams(filters);
        const response = await fetch(`/api/records${params.size > 0 ? `?${params}` : ''}`);

        if (!response.ok) {
          throw new Error(await errorMessage(response, '記録を取得できませんでした'));
        }

        const data = (await response.json()) as {
          items: RecordItem[];
          totalCount: number;
          page: number;
          pageSize: number;
        };
        this.records = data.items;
        this.totalCount = data.totalCount;
        this.page = data.page;
        this.pageSize = data.pageSize;
      } catch (error) {
        this.error = error instanceof Error ? error.message : '記録を取得できませんでした';
      } finally {
        this.loading = false;
      }
    },
    async fetchRecord(id: string) {
      this.detailLoading = true;
      this.error = null;
      this.selectedRecord = null;

      try {
        const response = await fetch(`/api/records/${id}`);

        if (!response.ok) {
          throw new Error(await errorMessage(response, '記録を取得できませんでした'));
        }

        const data = (await response.json()) as { record: RecordItem };
        this.selectedRecord = data.record;
      } catch (error) {
        this.error = error instanceof Error ? error.message : '記録を取得できませんでした';
      } finally {
        this.detailLoading = false;
      }
    }
  }
});

function toSearchParams(filters: RecordSearchFilters): URLSearchParams {
  const params = new URLSearchParams();

  appendString(params, 'keyword', filters.keyword);
  appendString(params, 'fromDate', filters.fromDate);
  appendString(params, 'toDate', filters.toDate);
  appendString(params, 'sort', filters.sort);
  appendNumber(params, 'page', filters.page);
  appendNumber(params, 'pageSize', filters.pageSize);
  filters.tags?.forEach((tag) => appendString(params, 'tags', tag));
  filters.types?.forEach((type) => appendString(params, 'types', type));

  return params;
}

function appendString(params: URLSearchParams, key: string, value: string | undefined) {
  if (value && value.trim().length > 0) {
    params.append(key, value.trim());
  }
}

function appendNumber(params: URLSearchParams, key: string, value: number | undefined) {
  if (typeof value === 'number') {
    params.append(key, String(value));
  }
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as
    | { message?: string; issues?: { message: string }[] }
    | null;

  if (data?.issues && data.issues.length > 0) {
    return data.issues.map((issue) => issue.message).join(' / ');
  }

  return data?.message ?? fallback;
}
