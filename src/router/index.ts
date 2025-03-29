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
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginPage.vue')
  },
  {
    path: '/n/:uuid',
    component: () => import('../views/NoteDetail.vue')
  },
  {
    path: '/f/:uuid/',
    component: () => import('../views/FolderPage.vue')
  },
  {
    path: '/f/:uuid/:uuid2',
    component: () => import('../views/FolderPage.vue')
  },
  {
    path: '/f/:uuid/:uuid2/:uuid3',
    component: () => import('../views/FolderPage.vue')
  },
  {
    path: '/f/:uuid/:uuid2/:uuid3/:uuid4',
    component: () => import('../views/FolderPage.vue')
  },
  {
    path: '/f/:uuid/:uuid2/:uuid3/:uuid4/:uuid5',
    component: () => import('../views/FolderPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
