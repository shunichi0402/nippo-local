<template>
  <v-card border>
    <v-card-title class="section-title">日報下書き</v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="12" md="4">
          <v-text-field label="対象日" type="date" v-model="targetDate" />
        </v-col>
        <v-col cols="12" md="8">
          <v-select
            label="構成"
            :items="sections"
            model-value="作業内容 / 気づき / 課題 / 次のアクション"
          />
        </v-col>
      </v-row>
      <v-textarea label="下書き" rows="8" v-model="draft" />
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn prepend-icon="mdi-content-save-outline" color="primary" variant="flat">
        保存
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const today = new Date().toISOString().slice(0, 10);
const targetDate = ref(today);
const draft = ref('');
const sections = ['作業内容 / 気づき / 課題 / 次のアクション'];
</script>

