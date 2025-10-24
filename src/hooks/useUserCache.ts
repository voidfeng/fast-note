import type { PublicUserInfo } from '@/types/pocketbase'
import { userApi } from '@/pocketbase'

// 全局用户缓存
const userCache = new Map<string, PublicUserInfo>()

export function useUserCache() {
  /**
   * 根据用户名获取用户信息
   * 如果全局变量没有数据就从接口获取
   */
  async function getPublicUserInfo(username: string): Promise<PublicUserInfo | null> {
    // 先检查内存缓存
    const cachedUser = userCache.get(username)
    if (cachedUser) {
      return cachedUser
    }

    // 从接口获取用户信息
    try {
      const user = await userApi.getUserByUsername(username)
      if (user) {
        userCache.set(username, user)
        return user
      }
    }
    catch (error) {
      console.error('获取用户信息失败:', error)
    }

    return null
  }

  return {
    getPublicUserInfo,
  }
}

// 导出一个全局实例，方便在其他地方使用
export const globalUserCache = useUserCache()
