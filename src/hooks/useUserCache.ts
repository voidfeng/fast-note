import { ref } from 'vue'
import { useUserPublicNotes } from './useUserPublicNotes'

interface CachedUser {
  id: string
  username: string
  name?: string
}

// 全局用户缓存
const userCache = new Map<string, CachedUser>()
const currentUser = ref<CachedUser | null>(null)

export function useUserCache() {
  // 获取缓存的用户信息
  function getCachedUser(username: string): CachedUser | null {
    return userCache.get(username) || null
  }

  // 设置缓存的用户信息
  function setCachedUser(username: string, user: CachedUser) {
    userCache.set(username, user)
    if (currentUser.value?.username === username) {
      currentUser.value = user
    }
  }

  // 获取当前用户
  function getCurrentUser(): CachedUser | null {
    return currentUser.value
  }

  // 设置当前用户
  function setCurrentUser(user: CachedUser | null) {
    currentUser.value = user
  }

  // 从本地数据库获取用户信息
  async function getUserFromCache(username: string): Promise<CachedUser | null> {
    // 先检查内存缓存
    const memoryCache = getCachedUser(username)
    if (memoryCache) {
      return memoryCache
    }

    // 从 IndexedDB 获取
    const userPublicNotes = useUserPublicNotes(username)
    await userPublicNotes.init()
    const localUserInfo = await userPublicNotes.getUserInfo()

    if (localUserInfo) {
      const cachedUser: CachedUser = {
        id: localUserInfo.id,
        username: localUserInfo.username,
        name: localUserInfo.name,
      }
      setCachedUser(username, cachedUser)
      return cachedUser
    }

    return null
  }

  // 保存用户信息到缓存和数据库
  async function saveUserToCache(username: string, user: CachedUser) {
    // 保存到内存缓存
    setCachedUser(username, user)

    // 保存到 IndexedDB
    const userPublicNotes = useUserPublicNotes(username)
    await userPublicNotes.init()
    await userPublicNotes.saveUserInfo(user)
  }

  // 获取用户ID（兼容旧代码中的 cachedUserId）
  function getCachedUserId(username: string): string | null {
    const user = getCachedUser(username)
    return user?.id || null
  }

  // 清除用户缓存
  function clearUserCache(username?: string) {
    if (username) {
      userCache.delete(username)
      if (currentUser.value?.username === username) {
        currentUser.value = null
      }
    }
    else {
      userCache.clear()
      currentUser.value = null
    }
  }

  return {
    getCachedUser,
    setCachedUser,
    getCurrentUser,
    setCurrentUser,
    getUserFromCache,
    saveUserToCache,
    getCachedUserId,
    clearUserCache,
  }
}

// 导出一个全局实例，方便在其他地方使用
export const globalUserCache = useUserCache()

// 兼容旧代码的全局变量
export function getCachedUserId(username: string): string | null {
  return globalUserCache.getCachedUserId(username)
}
