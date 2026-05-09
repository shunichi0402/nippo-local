<template>
  <div class="page">
    <v-btn prepend-icon="mdi-arrow-left" variant="text" class="mb-4" :to="{ name: 'records' }">
      記録
    </v-btn>

    <v-alert v-if="records.error" type="error" variant="tonal" class="mb-4">
      {{ records.error }}
    </v-alert>

    <v-card border>
      <v-progress-linear v-if="records.detailLoading" indeterminate color="primary" />

      <template v-if="record">
        <v-card-title class="detail-title">
          <v-avatar color="primary" variant="tonal" rounded="sm">
            <v-icon :icon="kindIcon(record.kind)" />
          </v-avatar>
          <span>{{ record.title }}</span>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <dl class="metadata">
            <div>
              <dt>対象日</dt>
              <dd>{{ record.targetDate }}</dd>
            </div>
            <div>
              <dt>種類</dt>
              <dd>{{ kindLabel(record.kind) }}</dd>
            </div>
            <div>
              <dt>更新日</dt>
              <dd>{{ record.updatedAt }}</dd>
            </div>
          </dl>

          <div v-if="record.tags.length > 0" class="tags">
            <v-chip v-for="tag in record.tags" :key="tag" size="small" variant="tonal">
              {{ tag }}
            </v-chip>
          </div>

          <section class="record-section">
            <h2>本文</h2>
            <p>{{ record.body || '本文なし' }}</p>
          </section>

          <section v-if="record.transcript" class="record-section">
            <h2>文字起こし</h2>
            <p>{{ record.transcript }}</p>
          </section>
        </v-card-text>
      </template>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useRecordsStore, type RecordKind } from '../stores/records';

const route = useRoute();
const records = useRecordsStore();
const record = computed(() => records.selectedRecord);

onMounted(() => {
  void load();
});

watch(
  () => route.params.id,
  () => {
    void load();
  }
);

async function load() {
  if (typeof route.params.id === 'string') {
    await records.fetchRecord(route.params.id);
  }
}

function kindLabel(kind: RecordKind): string {
  const labels: Record<RecordKind, string> = {
    memo: 'メモ',
    photo: '写真',
    audio: '音声',
    transcript: '文字起こし',
    daily_report: '日報',
    monthly_report: '月報'
  };

  return labels[kind];
}

function kindIcon(kind: RecordKind): string {
  const icons: Record<RecordKind, string> = {
    memo: 'mdi-note-outline',
    photo: 'mdi-image-outline',
    audio: 'mdi-microphone-outline',
    transcript: 'mdi-text-box-search-outline',
    daily_report: 'mdi-calendar-today-outline',
    monthly_report: 'mdi-calendar-month-outline'
  };

  return icons[kind];
}
</script>

<style scoped>
.detail-title {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 1.15rem;
  line-height: 1.35;
}

.metadata {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 16px;
}

.metadata div {
  min-width: 0;
}

.metadata dt {
  color: #667085;
  font-size: 0.8rem;
}

.metadata dd {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.record-section {
  margin-top: 20px;
}

.record-section h2 {
  font-size: 1rem;
  margin: 0 0 8px;
}

.record-section p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

@media (max-width: 720px) {
  .metadata {
    grid-template-columns: 1fr;
  }
}
</style>
