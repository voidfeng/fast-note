/**
 * PocketBase 用户服务
 */
import { mapErrorMessage, pb } from './client'

export const usersService = {
  /**
   * 根据用户名获取用户信息
   */
  async getUserByUsername(username: string): Promise<any | null> {
    try {
      // 从 public_users 视图查询用户名匹配的用户
      const record = await pb.collection('public_users').getFirstListItem(`username = "${username}"`)
      return record
    }
    catch (error: any) {
      // 如果是找不到记录的错误，返回 null
      if (error?.status === 404) {
        return null
      }
      console.error('根据用户名获取用户失败:', error)
      throw new Error(`根据用户名获取用户失败: ${mapErrorMessage(error)}`)
    }
  },

  /**
   * 根据用户ID获取用户信息
   */
  async getUserById(id: string): Promise<any | null> {
    try {
      const record = await pb.collection('users').getOne(id)
      return record
    }
    catch (error: any) {
      console.error('根据ID获取用户失败:', error)
      return null
    }
  },
}
