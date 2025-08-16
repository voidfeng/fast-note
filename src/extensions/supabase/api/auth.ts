import type { AuthResponse, OTPRequest, OTPVerification, UserMetadata } from '../types'
import { AUTH_CONSTANTS } from '../constants'
import { supabase } from './client'

// 认证 API 类
export class AuthAPI {
  // 用户登录
  static async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return {
          success: false,
          error: this.mapErrorMessage(error.message),
        }
      }

      return {
        success: true,
        data,
        user: data.user || undefined,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '登录失败',
      }
    }
  }

  // 用户注册
  static async signUp(email: string, password: string, metadata?: UserMetadata): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      })

      if (error) {
        return {
          success: false,
          error: this.mapErrorMessage(error.message),
        }
      }

      return {
        success: true,
        data,
        user: data.user || undefined,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '注册失败',
      }
    }
  }

  // 用户登出
  static async signOut(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        return {
          success: false,
          error: this.mapErrorMessage(error.message),
        }
      }

      return {
        success: true,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '登出失败',
      }
    }
  }

  // 获取当前用户
  static async getCurrentUser(): Promise<AuthResponse> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        return {
          success: false,
          error: this.mapErrorMessage(error.message),
        }
      }

      return {
        success: true,
        user: user || undefined,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取用户信息失败',
      }
    }
  }

  // 重置密码
  static async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)

      if (error) {
        return {
          success: false,
          error: this.mapErrorMessage(error.message),
        }
      }

      return {
        success: true,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '重置密码失败',
      }
    }
  }

  // 发送邮箱验证码（OTP）
  static async sendEmailOTP({ email }: OTPRequest): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) {
        return {
          success: false,
          error: this.mapErrorMessage(error.message),
        }
      }

      return {
        success: true,
        data,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : AUTH_CONSTANTS.ERRORS.OTP_SEND_FAILED,
      }
    }
  }

  // 使用邮箱验证码登录
  static async verifyEmailOTP({ email, token }: OTPVerification): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })

      if (error) {
        return {
          success: false,
          error: this.mapErrorMessage(error.message),
        }
      }

      return {
        success: true,
        data,
        user: data.user || undefined,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : AUTH_CONSTANTS.ERRORS.INVALID_OTP,
      }
    }
  }

  // 监听认证状态变化
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }

  // 获取当前会话
  static async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        return {
          success: false,
          error: this.mapErrorMessage(error.message),
        }
      }

      return {
        success: true,
        data: session,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取会话失败',
      }
    }
  }

  // 错误消息映射
  private static mapErrorMessage(errorMessage: string): string {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': AUTH_CONSTANTS.ERRORS.INVALID_CREDENTIALS,
      'User not found': AUTH_CONSTANTS.ERRORS.USER_NOT_FOUND,
      'Email not confirmed': AUTH_CONSTANTS.ERRORS.EMAIL_NOT_CONFIRMED,
      'Password should be at least 6 characters': AUTH_CONSTANTS.ERRORS.WEAK_PASSWORD,
      'User already registered': AUTH_CONSTANTS.ERRORS.EMAIL_ALREADY_EXISTS,
      'Token has expired or is invalid': AUTH_CONSTANTS.ERRORS.INVALID_OTP,
    }

    return errorMap[errorMessage] || errorMessage
  }
}

// 导出便捷方法
export const authApi = AuthAPI
