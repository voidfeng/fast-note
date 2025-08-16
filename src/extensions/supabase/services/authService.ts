import type { AuthResponse, AuthUser, UserMetadata } from '../types'
import { AuthAPI } from '../api/auth'
import { AUTH_CONSTANTS } from '../constants'

// 认证服务类
export class AuthService {
  private static otpCooldowns = new Map<string, number>()

  // 登录方法
  static async login(email: string, password: string): Promise<AuthResponse> {
    if (!this.validateEmail(email)) {
      return {
        success: false,
        error: '请输入有效的邮箱地址',
      }
    }

    if (!this.validatePassword(password)) {
      return {
        success: false,
        error: `密码长度至少为 ${AUTH_CONSTANTS.CONFIG.PASSWORD_MIN_LENGTH} 位`,
      }
    }

    return await AuthAPI.signIn(email, password)
  }

  // 注册方法
  static async register(email: string, password: string, metadata?: UserMetadata): Promise<AuthResponse> {
    if (!this.validateEmail(email)) {
      return {
        success: false,
        error: '请输入有效的邮箱地址',
      }
    }

    if (!this.validatePassword(password)) {
      return {
        success: false,
        error: `密码长度至少为 ${AUTH_CONSTANTS.CONFIG.PASSWORD_MIN_LENGTH} 位`,
      }
    }

    return await AuthAPI.signUp(email, password, metadata)
  }

  // 发送 OTP
  static async sendOTP(email: string): Promise<AuthResponse> {
    if (!this.validateEmail(email)) {
      return {
        success: false,
        error: '请输入有效的邮箱地址',
      }
    }

    // 检查冷却时间
    const cooldownKey = `otp_${email}`
    const lastSent = this.otpCooldowns.get(cooldownKey)
    const now = Date.now()

    if (lastSent && (now - lastSent) < AUTH_CONSTANTS.CONFIG.RESEND_COOLDOWN * 1000) {
      const remainingTime = Math.ceil((AUTH_CONSTANTS.CONFIG.RESEND_COOLDOWN * 1000 - (now - lastSent)) / 1000)
      return {
        success: false,
        error: `请等待 ${remainingTime} 秒后再次发送`,
      }
    }

    const result = await AuthAPI.sendEmailOTP({ email })

    if (result.success) {
      // 设置冷却时间
      this.otpCooldowns.set(cooldownKey, now)

      // 清理过期的冷却记录
      setTimeout(() => {
        this.otpCooldowns.delete(cooldownKey)
      }, AUTH_CONSTANTS.CONFIG.RESEND_COOLDOWN * 1000)
    }

    return result
  }

  // 验证 OTP
  static async verifyOTP(email: string, token: string): Promise<AuthResponse> {
    if (!this.validateEmail(email)) {
      return {
        success: false,
        error: '请输入有效的邮箱地址',
      }
    }

    if (!token || token.length !== 6) {
      return {
        success: false,
        error: '请输入6位验证码',
      }
    }

    return await AuthAPI.verifyEmailOTP({ email, token })
  }

  // 登出
  static async logout(): Promise<AuthResponse> {
    return await AuthAPI.signOut()
  }

  // 重置密码
  static async resetPassword(email: string): Promise<AuthResponse> {
    if (!this.validateEmail(email)) {
      return {
        success: false,
        error: '请输入有效的邮箱地址',
      }
    }

    return await AuthAPI.resetPassword(email)
  }

  // 获取当前用户
  static async getCurrentUser(): Promise<AuthResponse<AuthUser>> {
    return await AuthAPI.getCurrentUser()
  }

  // 获取当前会话
  static async getSession() {
    return await AuthAPI.getSession()
  }

  // 监听认证状态变化
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return AuthAPI.onAuthStateChange(callback)
  }

  // 邮箱验证
  private static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // 密码验证
  private static validatePassword(password: string): boolean {
    return password.length >= AUTH_CONSTANTS.CONFIG.PASSWORD_MIN_LENGTH
  }

  // 获取剩余冷却时间
  static getRemainingCooldown(email: string): number {
    const cooldownKey = `otp_${email}`
    const lastSent = this.otpCooldowns.get(cooldownKey)

    if (!lastSent)
      return 0

    const now = Date.now()
    const elapsed = now - lastSent
    const remaining = AUTH_CONSTANTS.CONFIG.RESEND_COOLDOWN * 1000 - elapsed

    return Math.max(0, Math.ceil(remaining / 1000))
  }
}

// 导出便捷方法
export const authService = AuthService
