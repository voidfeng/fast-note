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
  // 用户公开文件夹内部页面
  {
    path: '/:userId/f/:pathMatch(.*)*',
    name: 'UserFolder',
    component: () => import('../views/FolderPage.vue'),
  },
  // 用户公开笔记详情页面
  {
    path: '/:userId/n/:noteId',
    name: 'UserNote',
    component: () => import('../views/NoteDetail.vue'),
  },
  // 用户公开笔记页面 - 放在具体路径后面，避免拦截其他路由
  {
    path: '/:userId',
    name: 'UserHome',
    component: () => import('../views/UserPublicNotesPage.vue'),
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
