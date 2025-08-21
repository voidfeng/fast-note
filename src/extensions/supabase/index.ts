import type { RouteRecordRaw } from 'vue-router'
import { routeManager } from '@/router/routeManager'
import LoginPage from './components/LoginPage.vue'
import UserProfile from './components/UserProfile.vue'
import { useAuth } from './hooks/useAuth'
import { useData } from './hooks/useData'
import { useProfile } from './hooks/useProfile'
import { useSync } from './hooks/useSync'

// 定义扩展路由
const supabaseRoutes: RouteRecordRaw[] = [
  {
    path: '/supabase/login',
    name: 'SupabaseLogin',
    component: LoginPage,
  },
  {
    path: '/auth/login',
    name: 'AuthLogin',
    component: LoginPage,
  },
]

// 导出 Supabase 扩展的所有组件和钩子函数
export {
  LoginPage,
  useAuth,
  useData,
  useProfile,
  UserProfile,
  useSync,
}

// 标记扩展是否已安装
let isInstalled = false

// 默认导出
export default {
  // 组件导出，供 ExtensionRenderer 使用
  LoginPage,
  UserProfile,

  // Hook 导出
  useAuth,
  useData,
  useSync,

  // 安装扩展
  install(app: any) {
    // 检查是否已经安装，避免重复安装
    if (isInstalled) {
      console.log('Supabase 扩展已经安装，跳过重复安装')
      return
    }

    console.log('安装 Supabase 用户认证扩展')

    // 注册全局组件
    app.component('SupabaseLoginPage', LoginPage)
    app.component('SupabaseUserProfile', UserProfile)

    // 动态注册路由（只有在路由未注册时才注册）
    if (!routeManager.hasExtensionRoutes('supabase')) {
      routeManager.registerExtensionRoutes('supabase', supabaseRoutes)
    }

    // 标记为已安装
    isInstalled = true
  },

  // 卸载扩展
  uninstall(app: any) {
    console.log('卸载 Supabase 用户认证扩展')

    // 移除动态注册的路由
    routeManager.unregisterExtensionRoutes('supabase')

    // 标记为未安装
    isInstalled = false
  },
}
