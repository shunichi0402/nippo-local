<template>
  <div class="page">
    <v-card border class="mb-4">
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" md="5">
            <v-text-field v-model="filters.keyword" label="キーワード" prepend-inner-icon="mdi-magnify" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="filters.targetDate" label="対象日" type="date" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="filters.kind" label="種類" :items="kinds" clearable />
          </v-col>
          <v-col cols="12" md="1">
            <v-btn
              block
              color="primary"
              icon="mdi-magnify"
              variant="tonal"
              aria-label="検索"
              @click="fetchRecords"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card border class="mb-4">
      <v-card-title class="section-title">写真だけの記録</v-card-title>
      <v-divider />
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" md="3">
            <v-text-field v-model="photoForm.targetDate" label="対象日" type="date" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="photoForm.title" label="タイトル" maxlength="120" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="photoForm.caption" label="説明文" maxlength="200" />
          </v-col>
          <v-col cols="12" md="3">
            <v-file-input
              v-model="photoForm.imageFile"
              accept="image/jpeg,image/png,image/webp"
              label="写真"
              prepend-icon=""
              prepend-inner-icon="mdi-image-plus-outline"
              show-size
            />
          </v-col>
          <v-col cols="12">
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              :disabled="!canCreatePhoto"
              :loading="records.saving"
              @click="createPhotoRecord"
            >
              作成
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-alert v-if="records.error" type="error" variant="tonal" class="mb-4">
      {{ records.error }}
    </v-alert>

    <RecordList
      :records="records.records"
      :loading="records.loading"
      @refresh="fetchRecords"
      @attach-photo="attachPhoto"
      @update-caption="updateCaption"
      @delete-attachment="deleteAttachment"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import RecordList from '../components/records/RecordList.vue';
import { useRecordsStore } from '../stores/records';

const records = useRecordsStore();
const kinds = ['memo', 'photo', 'audio', 'transcript', 'daily_report', 'monthly_report'];

const filters = reactive({
  keyword: '',
  targetDate: '',
  kind: ''
});

const photoForm = reactive<{
  targetDate: string;
  title: string;
  caption: string;
  imageFile: File | null;
}>({
  targetDate: new Date().toISOString().slice(0, 10),
  title: '',
  caption: '',
  imageFile: null
});

const canCreatePhoto = computed(() => Boolean(photoForm.targetDate && photoForm.imageFile));

fetchRecords();

async function fetchRecords() {
  await records.fetchRecords(filters);
}

async function createPhotoRecord() {
  if (!photoForm.imageFile) {
    return;
  }

  await records.createPhotoRecord({
    targetDate: photoForm.targetDate,
    title: photoForm.title,
    caption: photoForm.caption,
    imageFile: photoForm.imageFile
  });
  photoForm.title = '';
  photoForm.caption = '';
  photoForm.imageFile = null;
  await fetchRecords();
}

async function attachPhoto(recordId: string, file: File, caption: string) {
  await records.attachPhoto(recordId, file, caption);
  await fetchRecords();
}

async function updateCaption(attachmentId: string, caption: string) {
  await records.updatePhotoCaption(attachmentId, caption);
  await fetchRecords();
}

async function deleteAttachment(attachmentId: string, deleteMode: 'detach_only' | 'delete_file') {
  await records.deletePhotoAttachment(attachmentId, deleteMode);
  await fetchRecords();
}
</script>
