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

        <div v-if="record.attachments.length > 0" class="photo-grid mt-3">
          <div v-for="attachment in record.attachments" :key="attachment.id" class="photo-item">
            <v-img :src="attachment.previewUrl" :alt="attachment.caption || attachment.originalName" cover />
            <div class="photo-controls">
              <v-text-field
                :model-value="captionFor(attachment.id, attachment.caption)"
                density="compact"
                hide-details
                label="説明文"
                maxlength="200"
                @update:model-value="(value) => setCaption(attachment.id, value)"
              />
              <v-btn
                icon="mdi-content-save-outline"
                size="small"
                variant="text"
                aria-label="説明文を保存"
                @click="$emit('updateCaption', attachment.id, captionFor(attachment.id, attachment.caption))"
              />
              <v-menu>
                <template #activator="{ props: menuProps }">
                  <v-btn
                    v-bind="menuProps"
                    icon="mdi-delete-outline"
                    size="small"
                    variant="text"
                    aria-label="写真を削除"
                  />
                </template>
                <v-list density="compact">
                  <v-list-item
                    title="参照だけ外す"
                    prepend-icon="mdi-link-off"
                    @click="$emit('deleteAttachment', attachment.id, 'detach_only')"
                  />
                  <v-list-item
                    title="実ファイルも削除"
                    prepend-icon="mdi-delete-forever-outline"
                    @click="$emit('deleteAttachment', attachment.id, 'delete_file')"
                  />
                </v-list>
              </v-menu>
            </div>
          </div>
        </div>

        <v-row class="mt-2" align="center" dense>
          <v-col cols="12" md="5">
            <v-file-input
              :model-value="fileFor(record.id)"
              accept="image/jpeg,image/png,image/webp"
              density="compact"
              hide-details
              label="写真を添付"
              prepend-icon=""
              prepend-inner-icon="mdi-image-plus-outline"
              show-size
              @update:model-value="(file) => setFile(record.id, file)"
            />
          </v-col>
          <v-col cols="12" md="5">
            <v-text-field
              :model-value="attachmentCaptionFor(record.id)"
              density="compact"
              hide-details
              label="説明文"
              maxlength="200"
              @update:model-value="(value) => setAttachmentCaption(record.id, value)"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-btn
              block
              color="primary"
              prepend-icon="mdi-paperclip"
              variant="tonal"
              :disabled="!fileFor(record.id)"
              @click="submitAttachment(record.id)"
            >
              添付
            </v-btn>
          </v-col>
        </v-row>
      </v-list-item>
    </v-list>

    <v-card-text v-else class="muted">
      まだ記録がありません。
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import type { RecordItem, RecordKind } from '../../stores/records';

defineProps<{
  records: RecordItem[];
  loading: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
  attachPhoto: [recordId: string, file: File, caption: string];
  updateCaption: [attachmentId: string, caption: string];
  deleteAttachment: [attachmentId: string, deleteMode: 'detach_only' | 'delete_file'];
}>();

type AttachmentForm = {
  file: File | null;
  caption: string;
};

const attachmentForms = reactive<Record<string, AttachmentForm>>({});
const captionDrafts = reactive<Record<string, string>>({});

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

function formFor(recordId: string): AttachmentForm {
  attachmentForms[recordId] ??= {
    file: null,
    caption: ''
  };

  return attachmentForms[recordId];
}

function fileFor(recordId: string): File | null {
  return formFor(recordId).file;
}

function setFile(recordId: string, value: File | File[] | null): void {
  formFor(recordId).file = Array.isArray(value) ? (value[0] ?? null) : value;
}

function attachmentCaptionFor(recordId: string): string {
  return formFor(recordId).caption;
}

function setAttachmentCaption(recordId: string, value: string): void {
  formFor(recordId).caption = value;
}

function captionFor(attachmentId: string, fallback: string): string {
  return captionDrafts[attachmentId] ?? fallback;
}

function setCaption(attachmentId: string, value: string): void {
  captionDrafts[attachmentId] = value;
}

function submitAttachment(recordId: string): void {
  const form = formFor(recordId);

  if (!form.file) {
    return;
  }

  emit('attachPhoto', recordId, form.file, form.caption);
  form.file = null;
  form.caption = '';
}
</script>

<style scoped>
.photo-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.photo-item {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  overflow: hidden;
}

.photo-item :deep(.v-img) {
  aspect-ratio: 4 / 3;
}

.photo-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 4px;
  padding: 8px;
}
</style>
