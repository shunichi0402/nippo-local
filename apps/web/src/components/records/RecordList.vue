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

        <div v-if="record.audioAttachments.length > 0" class="audio-stack mt-3">
          <div v-for="attachment in record.audioAttachments" :key="attachment.id" class="audio-attachment">
            <div class="d-flex align-center ga-2 mb-2">
              <v-icon icon="mdi-volume-high" size="18" />
              <span class="text-caption">{{ attachment.originalFileName || attachment.fileName }}</span>
              <v-chip size="x-small" variant="tonal">{{ attachment.mimeType }}</v-chip>
            </div>
            <audio class="audio-player" controls :src="audioUrl(attachment.storagePath)" />
            <div class="transcript-grid mt-2">
              <v-select
                v-model="methodDrafts[attachment.id]"
                :items="transcriptMethodItems"
                density="compact"
                hide-details
                label="方式"
              />
              <v-textarea
                v-model="transcriptDrafts[attachment.id]"
                auto-grow
                rows="2"
                counter="50000"
                label="文字起こし"
                density="compact"
                hide-details
              />
              <v-btn
                icon="mdi-content-save-outline"
                variant="tonal"
                aria-label="文字起こしを保存"
                @click="saveTranscript(record.id, attachment.id)"
              />
            </div>
          </div>
        </div>
      </v-list-item>
    </v-list>

    <v-card-text v-else class="muted">
      まだ記録がありません。
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { RecordItem, RecordKind, TranscriptMethod } from '../../stores/records';

const props = defineProps<{
  records: RecordItem[];
  loading: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
  saveTranscript: [
    payload: {
      recordId: string;
      attachmentId: string;
      transcriptText: string;
      transcriptMethod: TranscriptMethod;
    }
  ];
}>();

const transcriptDrafts = reactive<Record<string, string>>({});
const methodDrafts = reactive<Record<string, TranscriptMethod>>({});
const transcriptMethodItems = [
  { title: '手入力', value: 'manual' },
  { title: 'ローカルモデル', value: 'local_model' },
  { title: '外部 API', value: 'external_api' }
];

watch(
  () => props.records,
  (records) => {
    for (const record of records) {
      for (const attachment of record.audioAttachments) {
        transcriptDrafts[attachment.id] = attachment.transcriptText ?? '';
        methodDrafts[attachment.id] = attachment.transcriptMethod ?? 'manual';
      }
    }
  },
  { immediate: true }
);

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

function audioUrl(storagePath: string): string {
  return `/media/${storagePath}`;
}

function saveTranscript(recordId: string, attachmentId: string): void {
  const transcriptMethod = methodDrafts[attachmentId] ?? 'manual';
  const transcriptText = transcriptDrafts[attachmentId] ?? '';

  if (transcriptMethod === 'external_api') {
    const confirmed = window.confirm(
      [
        '外部 API 送信対象',
        `recordId: ${recordId}`,
        `attachmentId: ${attachmentId}`,
        `文字数: ${transcriptText.length}`
      ].join('\n')
    );

    if (!confirmed) {
      return;
    }
  }

  emit('saveTranscript', {
    recordId,
    attachmentId,
    transcriptText,
    transcriptMethod
  });
}
</script>

<style scoped>
.audio-stack {
  display: grid;
  gap: 12px;
}

.audio-attachment {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  padding: 12px;
}

.audio-player {
  width: 100%;
  min-height: 40px;
}

.transcript-grid {
  display: grid;
  grid-template-columns: minmax(150px, 180px) minmax(0, 1fr) 40px;
  gap: 8px;
  align-items: start;
}

@media (max-width: 720px) {
  .transcript-grid {
    grid-template-columns: 1fr 40px;
  }

  .transcript-grid :deep(.v-select) {
    grid-column: 1 / -1;
  }
}
</style>
