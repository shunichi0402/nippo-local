<template>
  <v-card border>
    <v-card-title class="d-flex align-center justify-space-between">
      <span class="section-title">最近の記録</span>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        aria-label="再読み込み"
        :loading="loading"
        @click="$emit('refresh')"
      />
    </v-card-title>
    <v-divider />

    <v-list v-if="records.length > 0" lines="three">
      <v-list-item v-for="record in records" :key="record.id">
        <template #prepend>
          <v-avatar color="primary" variant="tonal" rounded="sm">
            <v-icon :icon="kindIcon(record.kind)" />
          </v-avatar>
        </template>

        <v-list-item-title>{{ record.title || '無題のメモ' }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ record.targetDate }} / {{ preview(record.body) }}
        </v-list-item-subtitle>

        <template #append>
          <div class="record-actions">
            <div class="record-chips">
              <v-chip v-if="record.category" size="small" variant="tonal" color="secondary">
                {{ record.category }}
              </v-chip>
              <v-chip v-if="record.project" size="small" variant="tonal" color="info">
                {{ record.project }}
              </v-chip>
              <v-chip v-for="tag in record.tags" :key="tag" size="small" variant="tonal">
                {{ tag }}
              </v-chip>
            </div>
            <v-btn icon="mdi-pencil-outline" variant="text" size="small" aria-label="編集" @click="$emit('edit', record)" />
            <v-btn
              icon="mdi-trash-can-outline"
              variant="text"
              size="small"
              color="error"
              aria-label="削除"
              @click="$emit('delete', record)"
            />
          </div>
        </template>
      </v-list-item>
    </v-list>

    <v-card-text v-else class="muted">
      まだ記録がありません。
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { RecordItem, RecordKind } from '../../stores/records';

defineProps<{
  records: RecordItem[];
  loading: boolean;
}>();

defineEmits<{
  refresh: [];
  edit: [record: RecordItem];
  delete: [record: RecordItem];
}>();

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

function preview(body: string): string {
  return body.length > 120 ? `${body.slice(0, 120)}...` : body;
}
</script>

<style scoped>
.record-actions {
  align-items: center;
  display: flex;
  gap: 4px;
  max-width: 460px;
}

.record-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}
</style>
