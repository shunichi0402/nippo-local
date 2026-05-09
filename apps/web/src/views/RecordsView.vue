<template>
  <div class="page">
    <v-card border class="mb-4">
      <v-card-title class="section-title">音声</v-card-title>
      <v-divider />
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-text-field v-model="authUserId" label="ユーザー ID" density="compact" hide-details />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="audioForm.recordId"
              :items="recordDestinationItems"
              label="保存先"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="audioForm.targetDate"
              label="対象日"
              type="date"
              density="compact"
              hide-details
              :disabled="Boolean(audioForm.recordId)"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field v-model="audioForm.title" label="タイトル" density="compact" hide-details />
          </v-col>
        </v-row>

        <v-row class="mt-1">
          <v-col cols="12" md="4">
            <v-file-input
              v-model="audioFile"
              label="音声ファイル"
              accept=".m4a,.mp3,.wav,.webm,audio/mp4,audio/mpeg,audio/wav,audio/webm"
              prepend-icon=""
              prepend-inner-icon="mdi-paperclip"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="audioForm.transcriptMethod"
              :items="transcriptMethodItems"
              label="方式"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="5">
            <v-textarea
              v-model="audioForm.transcriptText"
              label="文字起こし"
              rows="1"
              auto-grow
              counter="50000"
              density="compact"
              hide-details
            />
          </v-col>
        </v-row>

        <div class="d-flex flex-wrap ga-2 mt-4">
          <v-btn
            color="primary"
            prepend-icon="mdi-upload-outline"
            variant="flat"
            :loading="records.loading && pendingAction === 'upload'"
            @click="uploadAudio"
          >
            取り込み
          </v-btn>
          <v-btn
            v-if="!isRecording"
            prepend-icon="mdi-record-circle-outline"
            variant="tonal"
            :loading="records.loading && pendingAction === 'start'"
            @click="startRecording"
          >
            録音開始
          </v-btn>
          <v-btn
            v-else
            color="error"
            prepend-icon="mdi-stop-circle-outline"
            variant="flat"
            :loading="records.loading && pendingAction === 'stop'"
            @click="stopRecording"
          >
            録音停止
          </v-btn>
          <v-chip v-if="recordingStartedAt" prepend-icon="mdi-timer-outline" variant="tonal">
            {{ recordingStartedAt }}
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <v-card border class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="5">
            <v-text-field v-model="query.keyword" label="キーワード" prepend-inner-icon="mdi-magnify" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="query.targetDate" label="対象日" type="date" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="query.kind" label="種類" :items="kinds" clearable />
          </v-col>
          <v-col cols="12" md="1" class="d-flex align-center">
            <v-btn icon="mdi-magnify" variant="tonal" aria-label="検索" @click="fetchRecords" />
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
      @save-transcript="saveTranscript"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import RecordList from '../components/records/RecordList.vue';
import { type TranscriptMethod, useRecordsStore } from '../stores/records';

const records = useRecordsStore();
const kinds = ['memo', 'photo', 'audio', 'transcript', 'daily_report', 'monthly_report'];
const today = new Date().toISOString().slice(0, 10);
const authUserId = ref('local-user');
const audioFile = ref<File | File[] | null>(null);
const pendingAction = ref<'upload' | 'start' | 'stop' | null>(null);
const isRecording = ref(false);
const recordingStartedAt = ref('');
const mediaRecorder = ref<MediaRecorder | null>(null);
const mediaStream = ref<MediaStream | null>(null);
const recordingChunks: BlobPart[] = [];

const audioForm = reactive({
  recordId: null as string | null,
  targetDate: today,
  title: '',
  transcriptText: '',
  transcriptMethod: 'manual' as TranscriptMethod
});

const query = reactive({
  keyword: '',
  targetDate: '',
  kind: ''
});

const transcriptMethodItems = [
  { title: '手入力', value: 'manual' },
  { title: 'ローカルモデル', value: 'local_model' },
  { title: '外部 API', value: 'external_api' }
];

const recordDestinationItems = computed(() => [
  { title: '音声だけの単体記録', value: null },
  ...records.records.map((record) => ({
    title: `${record.targetDate} / ${record.title}`,
    value: record.id
  }))
]);

onMounted(() => {
  fetchRecords();
});

onBeforeUnmount(() => {
  stopMediaTracks();
});

function fetchRecords(): void {
  records.fetchRecords({
    keyword: query.keyword,
    targetDate: query.targetDate,
    kind: query.kind
  });
}

async function uploadAudio(): Promise<void> {
  const file = selectedAudioFile();

  if (!file) {
    records.error = '音声ファイルを選択してください';
    return;
  }

  if (!confirmExternalApiTarget()) {
    return;
  }

  pendingAction.value = 'upload';

  try {
    await records.uploadAudio({
      ...baseAudioInput(),
      audioData: await readFileAsDataUrl(file),
      originalFileName: file.name,
      mimeType: file.type
    });
    resetAudioForm();
  } finally {
    pendingAction.value = null;
  }
}

async function startRecording(): Promise<void> {
  pendingAction.value = 'start';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await records.startRecording(authUserId.value);
    mediaStream.value = stream;
    recordingChunks.splice(0);

    const recorder = new MediaRecorder(stream);
    mediaRecorder.value = recorder;
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        recordingChunks.push(event.data);
      }
    });
    recorder.start();
    isRecording.value = true;
    recordingStartedAt.value = new Date().toLocaleTimeString();
  } catch (error) {
    records.error = error instanceof Error ? error.message : '録音を開始できませんでした';
    stopMediaTracks();
  } finally {
    pendingAction.value = null;
  }
}

async function stopRecording(): Promise<void> {
  const recorder = mediaRecorder.value;

  if (!recorder) {
    records.error = '録音が開始されていません';
    return;
  }

  if (!confirmExternalApiTarget()) {
    return;
  }

  pendingAction.value = 'stop';

  try {
    const blob = await stopRecorder(recorder);

    await records.stopRecording({
      ...baseAudioInput(),
      audioData: await readFileAsDataUrl(blob),
      originalFileName: `recording-${new Date().toISOString()}.webm`,
      mimeType: blob.type || 'audio/webm'
    });
    resetAudioForm();
  } catch (error) {
    records.error = error instanceof Error ? error.message : '録音を保存できませんでした';
  } finally {
    isRecording.value = false;
    recordingStartedAt.value = '';
    mediaRecorder.value = null;
    pendingAction.value = null;
    stopMediaTracks();
  }
}

async function saveTranscript(payload: {
  recordId: string;
  attachmentId: string;
  transcriptText: string;
  transcriptMethod: TranscriptMethod;
}): Promise<void> {
  await records.updateTranscript({
    authUserId: authUserId.value,
    ...payload
  });
}

function baseAudioInput() {
  return {
    authUserId: authUserId.value,
    recordId: audioForm.recordId ?? undefined,
    targetDate: audioForm.recordId ? undefined : audioForm.targetDate,
    title: audioForm.title || undefined,
    transcriptText: audioForm.transcriptText || undefined,
    transcriptMethod: audioForm.transcriptText ? audioForm.transcriptMethod : undefined
  };
}

function selectedAudioFile(): File | null {
  if (Array.isArray(audioFile.value)) {
    return audioFile.value[0] ?? null;
  }

  return audioFile.value;
}

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function stopRecorder(recorder: MediaRecorder): Promise<Blob> {
  return new Promise((resolve) => {
    recorder.addEventListener(
      'stop',
      () => {
        resolve(new Blob(recordingChunks, { type: recorder.mimeType || 'audio/webm' }));
      },
      { once: true }
    );
    recorder.stop();
  });
}

function stopMediaTracks(): void {
  mediaStream.value?.getTracks().forEach((track) => track.stop());
  mediaStream.value = null;
}

function confirmExternalApiTarget(): boolean {
  if (audioForm.transcriptMethod !== 'external_api') {
    return true;
  }

  return window.confirm(
    [
      '外部 API 送信対象',
      `保存先: ${audioForm.recordId || '新規音声記録'}`,
      `文字数: ${audioForm.transcriptText.length}`
    ].join('\n')
  );
}

function resetAudioForm(): void {
  audioFile.value = null;
  audioForm.title = '';
  audioForm.transcriptText = '';
  audioForm.transcriptMethod = 'manual';
}
</script>
