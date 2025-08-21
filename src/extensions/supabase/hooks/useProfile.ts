import { computed, ref, watch } from 'vue'
import { supabase } from '../api/client'
import { useAuth } from './useAuth'

// 用户 Profile 类型定义
export interface UserProfile {
  id: string
  username: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// localStorage 缓存键
const PROFILE_CACHE_KEY = 'supabase_user_profile'
const PROFILE_CACHE_EXPIRY_KEY = 'supabase_user_profile_expiry'

// 缓存过期时间（毫秒）- 默认 30 分钟
const CACHE_EXPIRY_TIME = 30 * 60 * 1000

// 全局状态
const profileData = ref<UserProfile | null>(null)
const isLoadingProfile = ref(false)
const profileError = ref<string | null>(null)

export function useProfile() {
  const { currentUser, isLoggedIn } = useAuth()

  // 清除 profile 缓存
  const clearProfileCache = () => {
    localStorage.removeItem(PROFILE_CACHE_KEY)
    localStorage.removeItem(PROFILE_CACHE_EXPIRY_KEY)
  }

  // 从 localStorage 获取缓存的 profile 数据
  const getCachedProfile = (): UserProfile | null => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY)
      const expiry = localStorage.getItem(PROFILE_CACHE_EXPIRY_KEY)

      if (!cached || !expiry)
        return null

      // 检查是否过期
      if (Date.now() > Number.parseInt(expiry)) {
        clearProfileCache()
        return null
      }

      return JSON.parse(cached)
    }
    catch (error) {
      console.error('获取缓存的 profile 数据失败:', error)
      clearProfileCache()
      return null
    }
  }

  // 缓存 profile 数据到 localStorage
  const cacheProfile = (profile: UserProfile) => {
    try {
      const expiry = Date.now() + CACHE_EXPIRY_TIME
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
      localStorage.setItem(PROFILE_CACHE_EXPIRY_KEY, expiry.toString())
    }
    catch (error) {
      console.error('缓存 profile 数据失败:', error)
    }
  }

  // 从服务器获取 profile 数据
  const fetchProfile = async (forceRefresh = false): Promise<UserProfile | null> => {
    if (!currentUser.value?.id) {
      profileError.value = '用户未登录'
      return null
    }

    // 如果不是强制刷新，先尝试从缓存获取
    if (!forceRefresh) {
      const cached = getCachedProfile()
      if (cached && cached.id === currentUser.value.id) {
        profileData.value = cached
        return cached
      }
    }

    isLoadingProfile.value = true
    profileError.value = null

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.value.id)
        .single()

      if (error) {
        throw error
      }

      if (data) {
        profileData.value = data
        cacheProfile(data)
        return data
      }

      return null
    }
    catch (error: any) {
      console.error('获取用户 profile 失败:', error)
      profileError.value = error.message || '获取用户信息失败'
      return null
    }
    finally {
      isLoadingProfile.value = false
    }
  }

  // 更新 profile 数据
  const updateProfile = async (updates: Partial<Pick<UserProfile, 'username' | 'avatar_url'>>): Promise<boolean> => {
    if (!currentUser.value?.id) {
      profileError.value = '用户未登录'
      return false
    }

    isLoadingProfile.value = true
    profileError.value = null

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.value.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      if (data) {
        profileData.value = data
        cacheProfile(data)
        return true
      }

      return false
    }
    catch (error: any) {
      console.error('更新用户 profile 失败:', error)
      profileError.value = error.message || '更新用户信息失败'
      return false
    }
    finally {
      isLoadingProfile.value = false
    }
  }

  // 检查用户名是否可用
  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    if (!username.trim())
      return false

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim())
        .neq('id', currentUser.value?.id || '')

      if (error) {
        throw error
      }

      return !data || data.length === 0
    }
    catch (error: any) {
      console.error('检查用户名可用性失败:', error)
      return false
    }
  }

  // 初始化 profile 数据
  const initProfile = async () => {
    if (isLoggedIn.value && currentUser.value?.id) {
      // 先尝试从缓存加载
      const cached = getCachedProfile()
      if (cached && cached.id === currentUser.value.id) {
        profileData.value = cached
      }

      // 然后从服务器获取最新数据
      await fetchProfile()
    }
  }

  // 清除 profile 数据（用户登出时调用）
  const clearProfile = () => {
    profileData.value = null
    profileError.value = null
    clearProfileCache()
  }

  // 监听登录状态变化
  watch(isLoggedIn, async (newValue) => {
    if (newValue) {
      await initProfile()
    }
    else {
      clearProfile()
    }
  }, { immediate: true })

  // 计算属性
  const hasProfile = computed(() => !!profileData.value)
  const hasUsername = computed(() => !!profileData.value?.username)
  const displayName = computed(() => {
    if (profileData.value?.username) {
      return profileData.value.username
    }
    return currentUser.value?.email?.split('@')[0] || '未知用户'
  })

  return {
    // 状态
    profile: profileData,
    isLoadingProfile,
    profileError,

    // 计算属性
    hasProfile,
    hasUsername,
    displayName,

    // 方法
    fetchProfile,
    updateProfile,
    checkUsernameAvailable,
    initProfile,
    clearProfile,
    clearProfileCache,
  }
}
