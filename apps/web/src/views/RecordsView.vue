<template>
  <div class="page">
    <v-card border class="mb-4">
      <v-card-text>
        <v-form @submit.prevent="search(true)">
        <v-row>
          <v-col cols="12" md="5">
            <v-text-field
              v-model="filters.keyword"
              label="キーワード"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="filters.fromDate" label="開始日" type="date" hide-details />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="filters.toDate" label="終了日" type="date" hide-details />
          </v-col>
          <v-col cols="12" md="1" class="d-flex align-center justify-end">
            <v-btn icon="mdi-magnify" color="primary" type="submit" aria-label="検索" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filters.types"
              label="種類"
              :items="kindItems"
              multiple
              chips
              closable-chips
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-combobox
              v-model="filters.tags"
              label="タグ"
              multiple
              chips
              closable-chips
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select v-model="filters.sort" label="並び順" :items="sortItems" hide-details />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="filters.pageSize"
              label="表示件数"
              :items="pageSizeItems"
              hide-details
              @update:model-value="search(true)"
            />
          </v-col>
        </v-row>
        </v-form>
      </v-card-text>
    </v-card>

    <v-alert v-if="records.error" type="error" variant="tonal" class="mb-4">
      {{ records.error }}
    </v-alert>

    <div class="results-bar">
      <span>{{ records.totalCount }} 件</span>
      <v-btn
        prepend-icon="mdi-refresh"
        variant="text"
        :loading="records.loading"
        @click="search(false)"
      >
        再読み込み
      </v-btn>
    </div>

    <RecordList :records="records.records" :loading="records.loading" />

    <div v-if="pageCount > 1" class="pagination-bar">
      <v-pagination
        v-model="filters.page"
        :length="pageCount"
        density="comfortable"
        rounded="sm"
        @update:model-value="search(false)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue';
import RecordList from '../components/records/RecordList.vue';
import { useRecordsStore, type RecordKind, type RecordSort } from '../stores/records';

const records = useRecordsStore();

const filters = reactive({
  keyword: '',
  fromDate: '',
  toDate: '',
  tags: [] as string[],
  types: [] as RecordKind[],
  sort: 'targetDate_desc' as RecordSort,
  page: 1,
  pageSize: 20
});

const kindItems: { title: string; value: RecordKind }[] = [
  { title: 'メモ', value: 'memo' },
  { title: '写真', value: 'photo' },
  { title: '音声', value: 'audio' },
  { title: '文字起こし', value: 'transcript' },
  { title: '日報', value: 'daily_report' },
  { title: '月報', value: 'monthly_report' }
];

const sortItems: { title: string; value: RecordSort }[] = [
  { title: '対象日 新しい順', value: 'targetDate_desc' },
  { title: '対象日 古い順', value: 'targetDate_asc' },
  { title: '更新日 新しい順', value: 'updatedAt_desc' }
];

const pageSizeItems = [10, 20, 50, 100];
const pageCount = computed(() => Math.max(1, Math.ceil(records.totalCount / filters.pageSize)));

async function search(resetPage: boolean) {
  if (resetPage) {
    filters.page = 1;
  }

  await records.fetchRecords({
    keyword: filters.keyword,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    tags: filters.tags,
    types: filters.types,
    sort: filters.sort,
    page: filters.page,
    pageSize: filters.pageSize
  });
}

onMounted(() => {
  void search(false);
});
</script>

<style scoped>
.results-bar,
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 12px;
}

.pagination-bar {
  justify-content: center;
  margin-top: 18px;
}
</style>
