<template>
  <div class="page">
    <v-tabs v-model="tab" color="primary" class="mb-4">
      <v-tab value="daily">日報</v-tab>
      <v-tab value="monthly">月報</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="daily">
        <ReportDraftPanel />
      </v-window-item>
      <v-window-item value="monthly">
        <v-card border>
          <v-card-title class="section-title">月報下書き</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field label="対象月" type="month" />
              </v-col>
            </v-row>
            <v-textarea label="下書き" rows="10" />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn prepend-icon="mdi-content-save-outline" color="primary" variant="flat">
              保存
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ReportDraftPanel from '../components/reports/ReportDraftPanel.vue';

const tab = ref('daily');
</script>

