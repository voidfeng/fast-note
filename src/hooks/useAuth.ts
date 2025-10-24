/**
 * 认证 Hook
 * 提供认证相关的响应式状态和方法
 */
import type { UserInfo } from '@/types'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getRealtimeInstance } from '@/core/realtime'
import { authService } from '@/pocketbase'
import { useSync } from './useSync'

// 全局状态
const currentUser = ref<UserInfo | null>(null)
const isLoading = ref(false)

export function useAuth() {
  // 认证状态变化监听器
  let authChangeUnsubscribe: (() => void) | null = null

  // 计算属性
  const isLoggedIn = computed(() => !!currentUser.value)
  const userInfo = computed<UserInfo | null>(() => currentUser.value)

  /**
   * 登录函数
   */
  async function login(email: string, password: string) {
    try {
      isLoading.value = true
      const result = await authService.signIn(email, password)

      if (result.success && result.user) {
        currentUser.value = result.user

        // 登录成功后，先建立 Realtime 连接，再执行数据同步
        try {
          // 1. 先建立 Realtime 连接，开始接收实时推送
          const realtime = getRealtimeInstance()
          await realtime.connect()
          console.log('登录后 Realtime 连接建立成功')

          // 2. 执行数据同步，获取云端最新数据
          // 在同步过程中如果有新的变更，也能通过 Realtime 接收到
          const { sync } = useSync()
          await sync()
          console.log('登录后数据同步完成')
        }
        catch (error) {
          console.error('登录后连接 Realtime 或同步失败:', error)
          // 不影响登录结果，只是记录错误
        }

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

  /**
   * 注册函数
   */
  async function register(email: string, password: string, passwordConfirm: string, username?: string) {
    try {
      isLoading.value = true
      const result = await authService.signUp(email, password, passwordConfirm, username)

      if (result.success && result.user) {
        currentUser.value = result.user
        return { success: true, user: result.user }
      }
      else {
        return { success: false, error: result.error }
      }
    }
    catch (error: any) {
      console.error('注册失败:', error.message)
      return { success: false, error: error.message }
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * 登出函数
   */
  async function logout() {
    try {
      isLoading.value = true

      // 断开 Realtime 连接
      const realtime = getRealtimeInstance()
      realtime.disconnect()
      console.log('登出时断开 Realtime 连接')

      await authService.signOut()

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

  /**
   * 初始化用户状态
   */
  async function initializeAuth() {
    try {
      isLoading.value = true

      // 首先从本地获取认证状态（不发起网络请求）
      const localUser = authService.getCurrentAuthUser()
      if (localUser) {
        currentUser.value = localUser
      }

      // 如果有认证信息，尝试刷新验证
      if (authService.isAuthenticated()) {
        const result = await authService.getCurrentUser()
        if (result.success && result.user) {
          currentUser.value = result.user

          // 用户已登录，先建立 Realtime 连接，再执行数据同步
          try {
            // 1. 先建立 Realtime 连接，开始接收实时推送
            const realtime = getRealtimeInstance()
            await realtime.connect()
            console.log('初始化时 Realtime 连接建立成功')

            // 2. 执行数据同步，获取云端最新数据
            // 在同步过程中如果有新的变更，也能通过 Realtime 接收到
            const { sync } = useSync()
            await sync()
            console.log('初始化时数据同步完成')
          }
          catch (error) {
            console.error('初始化时连接 Realtime 或同步失败:', error)
            // 不影响初始化结果
          }
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

  /**
   * 刷新用户信息
   */
  async function refreshUser() {
    if (!authService.isAuthenticated()) {
      currentUser.value = null
      return { success: false, error: '未认证' }
    }

    try {
      const result = await authService.getCurrentUser()
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

  /**
   * 获取认证令牌
   */
  function getToken() {
    return authService.getToken()
  }

  /**
   * 检查是否已认证
   */
  function isAuthenticated() {
    return authService.isAuthenticated()
  }

  /**
   * 设置认证状态监听器
   */
  function setupAuthListener() {
    authChangeUnsubscribe = authService.onAuthChange((token, model) => {
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
    register,
    logout,
    initializeAuth,
    refreshUser,
    getToken,
    isAuthenticated,
  }
}
