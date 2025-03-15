import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import HomePage from '../views/HomePage.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/n/:id',
    component: () => import('../views/NoteDetail.vue')
  },
  {
    path: '/f/:id/:id2',
    component: () => import('../views/FolderPage.vue')
  },
  {
    path: '/f/:id/:id2/:id3',
    component: () => import('../views/FolderPage.vue')
  },
  {
    path: '/f/:id/:id2/:id3/:id4',
    component: () => import('../views/FolderPage.vue')
  },
  {
    path: '/f/:id/:id2/:id3/:id4/:id5',
    component: () => import('../views/FolderPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
