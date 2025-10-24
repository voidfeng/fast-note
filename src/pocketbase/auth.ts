/**
 * PocketBase 认证服务
 */
import type { UserInfo } from '@/types'
import type { AuthResponse } from '@/types/pocketbase'
import { mapErrorMessage, pb } from './client'

export const authService = {
  /**
   * 用户登录
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password)

      return {
        success: true,
        user: authData.record as unknown as UserInfo,
        token: authData.token,
      }
    }
    catch (error: any) {
      console.error('PocketBase 登录错误:', error)
      return {
        success: false,
        error: mapErrorMessage(error),
      }
    }
  },

  /**
   * 用户注册
   */
  async signUp(email: string, password: string, passwordConfirm: string, username?: string): Promise<AuthResponse> {
    try {
      // 创建用户
      const userData = {
        email,
        password,
        passwordConfirm,
        username,
        emailVisibility: false,
      }

      await pb.collection('users').create(userData)

      // 注册成功后自动登录
      const authData = await pb.collection('users').authWithPassword(email, password)

      return {
        success: true,
        user: authData.record as unknown as UserInfo,
        token: authData.token,
      }
    }
    catch (error: any) {
      console.error('PocketBase 注册错误:', error)

      // 处理特定的注册错误
      let errorMessage = mapErrorMessage(error)
      if (error?.data?.data) {
        const data = error.data.data
        if (data.email?.message) {
          errorMessage = '邮箱格式无效或已存在'
        }
        else if (data.password?.message) {
          errorMessage = '密码不符合要求'
        }
        else if (data.passwordConfirm?.message) {
          errorMessage = '两次输入的密码不一致'
        }
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  },

  /**
   * 用户登出
   */
  async signOut(): Promise<AuthResponse> {
    try {
      pb.authStore.clear()
      return {
        success: true,
      }
    }
    catch (error: any) {
      console.error('PocketBase 登出错误:', error)
      return {
        success: false,
        error: mapErrorMessage(error),
      }
    }
  },

  /**
   * 获取当前用户
   */
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      // 检查是否有有效的认证
      if (!pb.authStore.isValid) {
        return {
          success: false,
          error: '未找到有效的认证信息',
        }
      }

      // 刷新认证信息（这会验证当前token是否有效）
      const authData = await pb.collection('users').authRefresh()

      return {
        success: true,
        user: authData.record as unknown as UserInfo,
        token: authData.token,
      }
    }
    catch (error: any) {
      console.error('获取当前用户错误:', error)
      // 如果认证失败，清除无效的认证信息
      pb.authStore.clear()
      return {
        success: false,
        error: mapErrorMessage(error),
      }
    }
  },

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return pb.authStore.isValid
  },

  /**
   * 获取认证令牌
   */
  getToken(): string | null {
    return pb.authStore.token || null
  },

  /**
   * 获取当前认证用户（不发起网络请求）
   */
  getCurrentAuthUser(): any | null {
    if (!pb.authStore.isValid || !pb.authStore.model) {
      return null
    }
    return pb.authStore.model
  },

  /**
   * 监听认证状态变化
   */
  onAuthChange(callback: (token: string, model: any) => void): () => void {
    return pb.authStore.onChange(callback)
  },
}
