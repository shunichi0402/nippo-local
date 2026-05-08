import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
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
      path: '/reports',
      name: 'reports',
      component: ReportsView
    }
  ]
});

