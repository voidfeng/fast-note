import type { Session, User } from '@supabase/supabase-js'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { authApi } from '../api/supabaseClient'

// 用户信息接口
interface UserInfo {
  id: string
  email: string
  name?: string
  avatar?: string
  metadata?: any
}

// 全局状态
const currentUser = ref<User | null>(null)
const currentSession = ref<Session | null>(null)
const isLoading = ref(true)

export function useSupabaseAuth() {
  // 计算属性
  const isLoggedIn = computed(() => !!currentUser.value)
  const userInfo = computed<UserInfo | null>(() => {
    if (!currentUser.value)
      return null

    return {
      id: currentUser.value.id,
      email: currentUser.value.email || '',
      name: currentUser.value.user_metadata?.name || currentUser.value.email,
      avatar: currentUser.value.user_metadata?.avatar_url,
      metadata: currentUser.value.user_metadata,
    }
  })

  // 登录函数
  const login = async (email: string, password: string) => {
    try {
      isLoading.value = true
      const { user, session } = await authApi.signIn(email, password)
      currentUser.value = user
      currentSession.value = session
      return { success: true, user, session }
    }
    catch (error: any) {
      console.error('登录失败:', error.message)
      return { success: false, error: error.message }
    }
    finally {
      isLoading.value = false
    }
  }

  // 注册函数
  const register = async (email: string, password: string, metadata?: any) => {
    try {
      isLoading.value = true
      const { user, session } = await authApi.signUp(email, password, metadata)
      currentUser.value = user
      currentSession.value = session
      return { success: true, user, session }
    }
    catch (error: any) {
      console.error('注册失败:', error.message)
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
      currentUser.value = null
      currentSession.value = null
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

  // 重置密码
  const resetPassword = async (email: string) => {
    try {
      await authApi.resetPassword(email)
      return { success: true }
    }
    catch (error: any) {
      console.error('重置密码失败:', error.message)
      return { success: false, error: error.message }
    }
  }

  // 发送邮箱验证码
  const sendEmailOTP = async (email: string) => {
    try {
      isLoading.value = true
      await authApi.sendEmailOTP(email)
      return { success: true }
    }
    catch (error: any) {
      console.error('发送验证码失败:', error.message)
      return { success: false, error: error.message }
    }
    finally {
      isLoading.value = false
    }
  }

  // 使用邮箱验证码登录
  const loginWithEmailOTP = async (email: string, token: string) => {
    try {
      isLoading.value = true
      const { user, session } = await authApi.verifyEmailOTP(email, token)
      currentUser.value = user
      currentSession.value = session
      return { success: true, user, session }
    }
    catch (error: any) {
      console.error('验证码登录失败:', error.message)
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
      const user = await authApi.getCurrentUser()
      currentUser.value = user
    }
    catch (error: any) {
      console.error('初始化认证状态失败:', error.message)
      currentUser.value = null
    }
    finally {
      isLoading.value = false
    }
  }

  // 监听认证状态变化
  let authListener: any = null

  onMounted(() => {
    // 初始化认证状态
    initializeAuth()

    // 监听认证状态变化
    authListener = authApi.onAuthStateChange((event, session) => {
      console.log('认证状态变化:', event, session)

      if (event === 'SIGNED_IN' && session) {
        currentUser.value = session.user
        currentSession.value = session
      }
      else if (event === 'SIGNED_OUT') {
        currentUser.value = null
        currentSession.value = null
      }

      isLoading.value = false
    })
  })

  onUnmounted(() => {
    // 清理监听器
    if (authListener) {
      authListener.data.subscription.unsubscribe()
    }
  })

  return {
    // 状态
    userInfo,
    isLoggedIn,
    isLoading,
    currentUser: computed(() => currentUser.value),
    currentSession: computed(() => currentSession.value),

    // 方法
    login,
    register,
    logout,
    resetPassword,
    sendEmailOTP,
    loginWithEmailOTP,
    initializeAuth,
  }
}
