<template>
  <div class="page">
    <v-card border class="mb-4">
      <v-card-title class="section-title">
        {{ editingRecord ? 'メモを編集' : 'メモを作成' }}
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-alert v-if="formMessage" class="mb-4" type="error" variant="tonal">
          {{ formMessage }}
        </v-alert>

        <v-form @submit.prevent="saveRecord">
          <v-row>
            <v-col cols="12" md="8">
              <v-text-field
                v-model="form.title"
                label="タイトル"
                maxlength="120"
                counter
                :error-messages="fieldErrors.title"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="form.targetDate"
                label="対象日"
                type="date"
                :error-messages="fieldErrors.targetDate"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.body"
                label="本文"
                rows="5"
                maxlength="10000"
                counter
                auto-grow
                :error-messages="fieldErrors.body"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.tagsText" label="タグ" :error-messages="fieldErrors.tags" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="form.category"
                label="カテゴリ"
                maxlength="30"
                counter
                :error-messages="fieldErrors.category"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="form.project"
                label="関連プロジェクト"
                maxlength="50"
                counter
                :error-messages="fieldErrors.project"
              />
            </v-col>
          </v-row>

          <div class="form-actions">
            <v-btn color="primary" type="submit" prepend-icon="mdi-content-save-outline" :loading="saving">
              {{ editingRecord ? '更新' : '保存' }}
            </v-btn>
            <v-btn v-if="editingRecord" variant="tonal" prepend-icon="mdi-close" @click="resetForm">
              キャンセル
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>

    <v-card border class="mb-4">
      <v-card-title class="section-title">検索</v-card-title>
      <v-divider />
      <v-card-text>
        <v-form @submit.prevent="applyFilters">
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field v-model="filters.keyword" label="キーワード" prepend-inner-icon="mdi-magnify" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="filters.targetDate" label="対象日" type="date" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="filters.kind" label="種類" :items="kinds" clearable />
            </v-col>
            <v-col cols="12" md="2">
              <v-text-field v-model="filters.tag" label="タグ" />
            </v-col>
          </v-row>

          <div class="form-actions">
            <v-btn color="primary" variant="tonal" type="submit" prepend-icon="mdi-magnify">
              検索
            </v-btn>
            <v-btn variant="text" prepend-icon="mdi-filter-off-outline" @click="clearFilters">
              クリア
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>

    <v-alert v-if="records.error" class="mb-4" type="error" variant="tonal">
      {{ records.error }}
    </v-alert>

    <RecordList
      :records="records.records"
      :loading="records.loading"
      @refresh="applyFilters"
      @edit="editRecord"
      @delete="confirmDelete"
    />

    <v-dialog v-model="deleteDialog" width="420">
      <v-card>
        <v-card-title class="section-title">メモを削除</v-card-title>
        <v-card-text>
          {{ pendingDelete?.title || '無題のメモ' }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">キャンセル</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="deleteRecord">削除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import RecordList from '../components/records/RecordList.vue';
import {
  ApiValidationError,
  type FieldErrors,
  type RecordItem,
  type RecordPayload,
  useRecordsStore
} from '../stores/records';

const records = useRecordsStore();
const kinds = [
  { title: 'メモ', value: 'memo' },
  { title: '写真', value: 'photo' },
  { title: '音声', value: 'audio' },
  { title: '文字起こし', value: 'transcript' },
  { title: '日報', value: 'daily_report' },
  { title: '月報', value: 'monthly_report' }
] as const;
const today = formatLocalDate(new Date());

const emptyForm = () => ({
  targetDate: today,
  title: '',
  body: '',
  tagsText: '',
  category: '',
  project: ''
});

const form = reactive(emptyForm());
const filters = reactive({
  keyword: '',
  targetDate: '',
  kind: null as RecordItem['kind'] | null,
  tag: ''
});
const fieldErrors = ref<FieldErrors>({});
const formMessage = ref<string | null>(null);
const saving = ref(false);
const deleting = ref(false);
const editingRecord = ref<RecordItem | null>(null);
const pendingDelete = ref<RecordItem | null>(null);
const deleteDialog = ref(false);

records.fetchRecords();

async function saveRecord() {
  saving.value = true;
  fieldErrors.value = {};
  formMessage.value = null;

  try {
    const payload = toPayload();

    if (editingRecord.value) {
      await records.updateRecord(editingRecord.value.id, payload);
    } else {
      await records.createRecord(payload);
    }

    resetForm();
    await applyFilters();
  } catch (error) {
    if (error instanceof ApiValidationError) {
      fieldErrors.value = error.fieldErrors;
    }

    formMessage.value = error instanceof Error ? error.message : 'メモを保存できませんでした';
  } finally {
    saving.value = false;
  }
}

function editRecord(record: RecordItem) {
  editingRecord.value = record;
  fieldErrors.value = {};
  formMessage.value = null;
  form.targetDate = record.targetDate;
  form.title = record.title;
  form.body = record.body;
  form.tagsText = record.tags.join(', ');
  form.category = record.category ?? '';
  form.project = record.project ?? '';
}

function resetForm() {
  Object.assign(form, emptyForm());
  editingRecord.value = null;
  fieldErrors.value = {};
  formMessage.value = null;
}

async function applyFilters() {
  await records.fetchRecords({
    keyword: filters.keyword.trim() || undefined,
    targetDate: filters.targetDate || undefined,
    kind: filters.kind ?? undefined,
    tag: filters.tag.trim() || undefined
  });
}

async function clearFilters() {
  filters.keyword = '';
  filters.targetDate = '';
  filters.kind = null;
  filters.tag = '';
  await applyFilters();
}

function confirmDelete(record: RecordItem) {
  pendingDelete.value = record;
  deleteDialog.value = true;
}

async function deleteRecord() {
  if (!pendingDelete.value) {
    return;
  }

  deleting.value = true;

  try {
    await records.deleteRecord(pendingDelete.value.id);
    deleteDialog.value = false;
    pendingDelete.value = null;
    await applyFilters();
  } catch (error) {
    formMessage.value = error instanceof Error ? error.message : 'メモを削除できませんでした';
  } finally {
    deleting.value = false;
  }
}

function toPayload(): RecordPayload {
  return {
    targetDate: form.targetDate,
    title: form.title,
    body: form.body,
    tags: form.tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    category: form.category.trim() || null,
    project: form.project.trim() || null
  };
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
</script>

<style scoped>
.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
</style>
