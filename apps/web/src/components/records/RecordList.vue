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

        <v-list-item-title>{{ record.title }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ record.targetDate }} / {{ record.body || '本文なし' }}
        </v-list-item-subtitle>

        <template #append>
          <v-chip v-for="tag in record.tags" :key="tag" size="small" variant="tonal" class="ml-1">
            {{ tag }}
          </v-chip>
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
</script>

