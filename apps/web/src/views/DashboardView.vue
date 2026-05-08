<template>
  <div class="page">
    <v-row>
      <v-col cols="12" md="8">
        <RecordList :records="records.records" :loading="records.loading" @refresh="records.fetchRecords" />
      </v-col>
      <v-col cols="12" md="4">
        <v-card border>
          <v-card-title class="section-title">今日</v-card-title>
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ today }}</div>
            <div class="muted mt-2">記録 {{ records.records.length }} 件</div>
          </v-card-text>
          <v-card-actions>
            <v-btn prepend-icon="mdi-note-plus-outline" color="primary" variant="flat">
              メモ
            </v-btn>
            <v-btn prepend-icon="mdi-microphone-outline" variant="tonal">
              録音
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import RecordList from '../components/records/RecordList.vue';
import { useRecordsStore } from '../stores/records';

const records = useRecordsStore();
const today = new Date().toISOString().slice(0, 10);

onMounted(() => {
  records.fetchRecords();
});
</script>

