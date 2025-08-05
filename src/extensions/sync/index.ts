import type { RouteRecordRaw } from 'vue-router'
import { routeManager } from '@/router/routeManager'
import LoginPage from './components/LoginPage.vue'
import SyncState from './components/SyncState.vue'
import UserProfile from './components/UserProfile.vue'
import { useAuth } from './hooks/useAuth'
import { useSync } from './hooks/useSync'

// 定义扩展路由
const syncRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'SyncLogin',
    component: LoginPage,
  },
  {
    path: '/sync/login',
    name: 'SyncLoginAlias',
    component: LoginPage,
  },
]

// 导出同步扩展的所有组件和钩子函数
export {
  LoginPage,
  SyncState,
  useAuth,
  UserProfile,
  useSync,
}

// 默认导出
export default {
  // 安装扩展
  install(app: any) {
    console.log('安装同步扩展')

    // 注册全局组件
    app.component('SyncState', SyncState)
    app.component('LoginPage', LoginPage)
    app.component('UserProfile', UserProfile)

    // 动态注册路由
    routeManager.registerExtensionRoutes('sync', syncRoutes)
  },

  // 卸载扩展
  uninstall(app: any) {
    console.log('卸载同步扩展')

    // 移除动态注册的路由
    routeManager.unregisterExtensionRoutes('sync')

    // 在Vue 3中，没有直接的方法来取消注册组件
    // 但我们可以通过其他方式处理卸载逻辑
  },
}
