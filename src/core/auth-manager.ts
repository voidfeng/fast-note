/**
 * 认证管理器
 * 全局单例，管理应用的认证状态
 */

import type { AuthChangeCallback, IAuthService } from './auth-types'
import type { UserInfo } from '@/types'
import { computed, ref } from 'vue'

class AuthManager {
  private authService: IAuthService | null = null
  private currentUser = ref<UserInfo | null>(null)
  private isLoading = ref(false)
  private authChangeUnsubscribe: (() => void) | null = null

  /**
   * 计算属性
   */
  readonly isLoggedIn = computed(() => !!this.currentUser.value)
  readonly userInfo = computed(() => this.currentUser.value)
  readonly loading = computed(() => this.isLoading.value)

  /**
   * 设置认证服务实现
   */
  setAuthService(service: IAuthService) {
    if (this.authService) {
      console.warn('认证服务已经设置，将被覆盖')
      this.cleanup()
    }

    this.authService = service
    this.setupAuthListener()
  }

  /**
   * 获取认证服务
   */
  getAuthService(): IAuthService {
    if (!this.authService) {
      throw new Error('认证服务未初始化，请先调用 setAuthService')
    }
    return this.authService
  }

  /**
   * 登录
   */
  async login(email: string, password: string) {
    if (!this.authService) {
      throw new Error('认证服务未初始化')
    }

    try {
      this.isLoading.value = true
      const result = await this.authService.signIn(email, password)

      if (result.success && result.user) {
        this.currentUser.value = result.user
      }

      return result
    }
    finally {
      this.isLoading.value = false
    }
  }

  /**
   * 注册
   */
  async register(email: string, password: string, passwordConfirm: string, username?: string) {
    if (!this.authService) {
      throw new Error('认证服务未初始化')
    }

    try {
      this.isLoading.value = true
      const result = await this.authService.signUp(email, password, passwordConfirm, username)

      if (result.success && result.user) {
        this.currentUser.value = result.user
      }

      return result
    }
    finally {
      this.isLoading.value = false
    }
  }

  /**
   * 登出
   */
  async logout() {
    if (!this.authService) {
      throw new Error('认证服务未初始化')
    }

    try {
      this.isLoading.value = true
      await this.authService.signOut()
      this.currentUser.value = null
      return { success: true }
    }
    catch (error: any) {
      console.error('登出失败:', error.message)
      return { success: false, error: error.message }
    }
    finally {
      this.isLoading.value = false
    }
  }

  /**
   * 初始化认证状态
   */
  async initialize() {
    if (!this.authService) {
      throw new Error('认证服务未初始化')
    }

    try {
      this.isLoading.value = true

      // 首先从本地获取认证状态
      const localUser = this.authService.getCurrentAuthUser()
      if (localUser) {
        this.currentUser.value = localUser
      }

      // 如果有认证信息，尝试刷新验证
      if (this.authService.isAuthenticated()) {
        const result = await this.authService.getCurrentUser()
        if (result.success && result.user) {
          this.currentUser.value = result.user
        }
        else {
          this.currentUser.value = null
        }
      }
      else {
        this.currentUser.value = null
      }
    }
    catch (error: any) {
      console.error('初始化认证状态失败:', error.message)
      this.currentUser.value = null
    }
    finally {
      this.isLoading.value = false
    }
  }

  /**
   * 刷新用户信息
   */
  async refreshUser() {
    if (!this.authService) {
      throw new Error('认证服务未初始化')
    }

    if (!this.authService.isAuthenticated()) {
      this.currentUser.value = null
      return { success: false, error: '未认证' }
    }

    try {
      const result = await this.authService.getCurrentUser()
      if (result.success && result.user) {
        this.currentUser.value = result.user
        return { success: true, user: result.user }
      }
      else {
        this.currentUser.value = null
        return { success: false, error: result.error }
      }
    }
    catch (error: any) {
      console.error('刷新用户信息失败:', error.message)
      this.currentUser.value = null
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取认证令牌
   */
  getToken(): string | null {
    if (!this.authService) {
      return null
    }
    return this.authService.getToken()
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    if (!this.authService) {
      return false
    }
    return this.authService.isAuthenticated()
  }

  /**
   * 设置认证状态监听器
   */
  private setupAuthListener() {
    if (!this.authService) {
      return
    }

    const callback: AuthChangeCallback = (token, user) => {
      if (token && user) {
        this.currentUser.value = user
      }
      else {
        this.currentUser.value = null
      }
    }

    this.authChangeUnsubscribe = this.authService.onAuthChange(callback)
  }

  /**
   * 清理资源
   */
  private cleanup() {
    if (this.authChangeUnsubscribe) {
      this.authChangeUnsubscribe()
      this.authChangeUnsubscribe = null
    }
  }
}

// 导出单例实例
export const authManager = new AuthManager()
