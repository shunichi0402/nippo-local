<template>
  <v-layout>
    <v-navigation-drawer permanent width="248">
      <v-list density="compact" nav>
        <v-list-item class="mb-2" title="nippo-local" subtitle="Local daily records" />
        <v-divider class="mb-2" />
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :to="item.to"
          rounded="sm"
        />
      </v-list>
    </v-navigation-drawer>

    <v-app-bar flat border>
      <v-app-bar-title>{{ routeTitle }}</v-app-bar-title>
      <v-spacer />
      <v-btn icon="mdi-plus" variant="text" aria-label="記録を追加" />
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const navItems = [
  { title: 'ダッシュボード', to: '/', icon: 'mdi-view-dashboard-outline' },
  { title: '記録', to: '/records', icon: 'mdi-note-text-outline' },
  { title: '日報・月報', to: '/reports', icon: 'mdi-file-document-edit-outline' }
];

const routeTitle = computed(() => {
  const current = navItems.find((item) => item.to === route.path);
  return current?.title ?? 'nippo-local';
});
</script>

