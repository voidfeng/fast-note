// import { getUserByUsername } from '@/extensions/supabase/api/userApi'

// 用户信息类型
interface UserInfo {
  id: string
  username: string
  name?: string
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
      // const user = await getUserByUsername(username)
      // if (user) {
      // const userInfo: UserInfo = {
      //   id: user.id,
      //   username: user.username,
      //   name: user.username || `用户 ${user.username}`,
      // }

      // 保存到内存缓存
      // userCache.set(username, userInfo)
      // return userInfo
      // }
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
      // const user = await getUserByUsername(username)
      // if (user) {
      //   const userInfo: UserInfo = {
      //     id: user.id,
      //     username: user.username,
      //     name: user.username || `用户 ${user.username}`,
      //   }

      //   // 更新内存缓存
      //   userCache.set(username, userInfo)
      //   return userInfo
      // }
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
