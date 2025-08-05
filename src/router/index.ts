import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from '@ionic/vue-router'
import HomePage from '../views/HomePage.vue'
import { routeManager } from './routeManager'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage,
  },
  {
    path: '/n/:uuid',
    component: () => import('../views/NoteDetail.vue'),
  },
  {
    path: '/f/:pathMatch(.*)*',
    name: 'Folder',
    component: () => import('../views/FolderPage.vue'),
  },
  {
    path: '/deleted',
    component: () => import('../views/DeletedPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 初始化路由管理器
routeManager.setRouter(router)

export default router
