/**
 * 认证服务核心类型定义
 * 定义认证相关的通用接口，不依赖具体实现
 */

import type { UserInfo } from '@/types'

/**
 * 认证结果
 */
export interface AuthResult {
  success: boolean
  user?: UserInfo
  error?: string
}

/**
 * 认证状态变化回调
 */
export type AuthChangeCallback = (token: string | null, user: UserInfo | null) => void

/**
 * 认证服务接口
 * 定义所有认证服务必须实现的方法
 */
export interface IAuthService {
  /**
   * 登录
   */
  signIn: (email: string, password: string) => Promise<AuthResult>

  /**
   * 注册
   */
  signUp: (email: string, password: string, passwordConfirm: string, username?: string) => Promise<AuthResult>

  /**
   * 登出
   */
  signOut: () => Promise<void>

  /**
   * 获取当前用户
   */
  getCurrentUser: () => Promise<AuthResult>

  /**
   * 获取本地认证用户（不发起网络请求）
   */
  getCurrentAuthUser: () => UserInfo | null

  /**
   * 检查是否已认证
   */
  isAuthenticated: () => boolean

  /**
   * 获取认证令牌
   */
  getToken: () => string | null

  /**
   * 监听认证状态变化
   */
  onAuthChange: (callback: AuthChangeCallback) => () => void
}
