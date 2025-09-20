import type { UserInfo } from '@/types'
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { authApi } from '../api/client'

// 全局状态
const currentUser = ref<UserInfo | null>(null)
const isLoading = ref(false)

export function useAuth() {
  // 认证状态变化监听器
  let authChangeUnsubscribe: (() => void) | null = null

  // 计算属性
  const isLoggedIn = computed(() => !!currentUser.value)
  const userInfo = computed<UserInfo | null>(() => currentUser.value)

  // 登录函数
  const login = async (email: string, password: string) => {
    try {
      isLoading.value = true
      const result = await authApi.signIn(email, password)

      if (result.success && result.user) {
        currentUser.value = result.user
        return { success: true, user: result.user }
      }
      else {
        return { success: false, error: result.error }
      }
    }
    catch (error: any) {
      console.error('登录失败:', error.message)
      return { success: false, error: error.message }
    }
    finally {
      isLoading.value = false
    }
  }

  // 登出函数
  const logout = async () => {
    try {
      isLoading.value = true
      await authApi.signOut()

      // 清除用户状态（注意：authStore.clear() 会触发监听器自动清除状态）
      currentUser.value = null

      return { success: true }
    }
    catch (error: any) {
      console.error('登出失败:', error.message)
      return { success: false, error: error.message }
    }
    finally {
      isLoading.value = false
    }
  }

  // 初始化用户状态
  const initializeAuth = async () => {
    try {
      isLoading.value = true

      // 首先从本地获取认证状态（不发起网络请求）
      const localUser = authApi.getCurrentAuthUser()
      if (localUser) {
        currentUser.value = localUser
      }

      // 如果有认证信息，尝试刷新验证
      if (authApi.isAuthenticated()) {
        const result = await authApi.getCurrentUser()
        if (result.success && result.user) {
          currentUser.value = result.user
        }
        else {
          // 如果获取失败，清除认证状态
          currentUser.value = null
        }
      }
      else {
        currentUser.value = null
      }
    }
    catch (error: any) {
      console.error('初始化认证状态失败:', error.message)
      currentUser.value = null
    }
    finally {
      isLoading.value = false
    }
  }

  // 刷新用户信息
  const refreshUser = async () => {
    if (!authApi.isAuthenticated()) {
      currentUser.value = null
      return { success: false, error: '未认证' }
    }

    try {
      const result = await authApi.getCurrentUser()
      if (result.success && result.user) {
        currentUser.value = result.user
        return { success: true, user: result.user }
      }
      else {
        currentUser.value = null
        return { success: false, error: result.error }
      }
    }
    catch (error: any) {
      console.error('刷新用户信息失败:', error.message)
      currentUser.value = null
      return { success: false, error: error.message }
    }
  }

  // 获取认证令牌
  const getToken = () => {
    return authApi.getToken()
  }

  // 检查是否已认证
  const isAuthenticated = () => {
    return authApi.isAuthenticated()
  }

  // 设置认证状态监听器
  const setupAuthListener = () => {
    authChangeUnsubscribe = authApi.onAuthChange((token, model) => {
      // 认证状态变化处理
      if (token && model) {
        // 登录状态
        const userInfo: UserInfo = model
        currentUser.value = userInfo
      }
      else {
        // 登出状态
        currentUser.value = null
      }
    })
  }

  // 组件挂载时初始化
  onMounted(() => {
    initializeAuth()
    setupAuthListener()
  })

  // 组件卸载时清理监听器
  onUnmounted(() => {
    if (authChangeUnsubscribe) {
      authChangeUnsubscribe()
      authChangeUnsubscribe = null
    }
  })

  return {
    // 状态
    userInfo,
    isLoggedIn,
    isLoading: computed(() => isLoading.value),
    currentUser: computed(() => currentUser.value),

    // 方法
    login,
    logout,
    initializeAuth,
    refreshUser,
    getToken,
    isAuthenticated,
  }
}
