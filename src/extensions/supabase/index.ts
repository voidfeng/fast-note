import type { RouteRecordRaw } from 'vue-router'
import { routeManager } from '@/router/routeManager'
import LoginPage from './components/LoginPage.vue'
import UserProfile from './components/UserProfile.vue'
import { useSupabaseAuth } from './hooks/useSupabaseAuth'

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
  // {
  //   path: '/supabase/otp-test',
  //   name: 'SupabaseOTPTest',
  //   component: OTPLoginTest,
  // },
]

// 导出 Supabase 扩展的所有组件和钩子函数
export {
  LoginPage,
  UserProfile,
  useSupabaseAuth,
}

// 默认导出
export default {
  // 安装扩展
  install(app: any) {
    console.log('安装 Supabase 用户认证扩展')

    // 注册全局组件
    app.component('SupabaseLoginPage', LoginPage)
    app.component('SupabaseUserProfile', UserProfile)

    // 动态注册路由
    routeManager.registerExtensionRoutes('supabase', supabaseRoutes)
  },

  // 卸载扩展
  uninstall(app: any) {
    console.log('卸载 Supabase 用户认证扩展')

    // 移除动态注册的路由
    routeManager.unregisterExtensionRoutes('supabase')
  },
}
