import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import RecordDetailView from '../views/RecordDetailView.vue';
import RecordsView from '../views/RecordsView.vue';
import ReportsView from '../views/ReportsView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView
    },
    {
      path: '/records',
      name: 'records',
      component: RecordsView
    },
    {
      path: '/records/:id',
      name: 'record-detail',
      component: RecordDetailView
    },
    {
      path: '/reports',
      name: 'reports',
      component: ReportsView
    }
  ]
});
