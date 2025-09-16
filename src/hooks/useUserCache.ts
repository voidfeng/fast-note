import { userApi } from '@/extensions/pocketbase/api/client'

// 用户信息类型（兼容缓存使用）
interface UserInfo {
  id: string
  username: string
  name?: string
  email?: string
  avatar?: string
  created?: string
  updated?: string
}

// 全局用户缓存
const userCache = new Map<string, UserInfo>()

export function useUserCache() {
  /**
   * 根据用户名获取用户信息
   * 如果全局变量没有数据就从接口获取
   */
  async function getUserInfo(username: string): Promise<UserInfo | null> {
    // 先检查内存缓存
    const cachedUser = userCache.get(username)
    if (cachedUser) {
      return cachedUser
    }

    // 从接口获取用户信息
    try {
      const user = await userApi.getUserByUsername(username)
      if (user) {
        const userInfo: UserInfo = {
          id: user.id,
          username: user.username || username,
          name: user.name || user.username || `用户 ${username}`,
          email: user.email,
          avatar: user.avatar,
          created: user.created,
          updated: user.updated,
        }

        // 保存到内存缓存
        userCache.set(username, userInfo)
        return userInfo
      }
    }
    catch (error) {
      console.error('获取用户信息失败:', error)
    }

    return null
  }

  /**
   * 强制请求接口更新用户信息
   */
  async function forceUpdateUserInfo(username: string): Promise<UserInfo | null> {
    try {
      const user = await userApi.getUserByUsername(username)
      if (user) {
        const userInfo: UserInfo = {
          id: user.id,
          username: user.username || username,
          name: user.name || user.username || `用户 ${username}`,
          email: user.email,
          avatar: user.avatar,
          created: user.created,
          updated: user.updated,
        }

        // 更新内存缓存
        userCache.set(username, userInfo)
        return userInfo
      }
    }
    catch (error) {
      console.error('强制更新用户信息失败:', error)
    }

    return null
  }

  return {
    getUserInfo,
    forceUpdateUserInfo,
  }
}

// 导出一个全局实例，方便在其他地方使用
export const globalUserCache = useUserCache()
