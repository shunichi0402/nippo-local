<template>
  <v-card border>
    <v-card-title class="d-flex align-center justify-space-between">
      <span class="section-title">検索結果</span>
    </v-card-title>
    <v-divider />
    <v-progress-linear v-if="loading" indeterminate color="primary" />

    <v-list v-if="records.length > 0" lines="three">
      <v-list-item v-for="record in records" :key="record.id" :to="`/records/${record.id}`">
        <template #prepend>
          <v-avatar color="primary" variant="tonal" rounded="sm">
            <v-icon :icon="kindIcon(record.kind)" />
          </v-avatar>
        </template>

        <v-list-item-title>{{ record.title }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ record.targetDate }} / {{ preview(record) }}
        </v-list-item-subtitle>

        <template #append>
          <v-chip v-for="tag in record.tags" :key="tag" size="small" variant="tonal" class="ml-1">
            {{ tag }}
          </v-chip>
        </template>
      </v-list-item>
    </v-list>

    <v-card-text v-else class="muted">
      条件に一致する記録がありません。
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { RecordItem, RecordKind } from '../../stores/records';

defineProps<{
  records: RecordItem[];
  loading: boolean;
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

function preview(record: RecordItem): string {
  const source = record.body || record.transcript || '本文なし';

  return source.length > 80 ? `${source.slice(0, 80)}...` : source;
}
</script>
