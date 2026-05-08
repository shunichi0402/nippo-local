<template>
  <div class="page">
    <v-card border class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="5">
            <v-text-field label="キーワード" prepend-inner-icon="mdi-magnify" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field label="対象日" type="date" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select label="種類" :items="kinds" />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <RecordList :records="records.records" :loading="records.loading" @refresh="records.fetchRecords" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import RecordList from '../components/records/RecordList.vue';
import { useRecordsStore } from '../stores/records';

const records = useRecordsStore();
const kinds = ['memo', 'photo', 'audio', 'transcript', 'daily_report', 'monthly_report'];

onMounted(() => {
  records.fetchRecords();
});
</script>

