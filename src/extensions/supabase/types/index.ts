import type { Session, User } from '@supabase/supabase-js'

// 认证相关类型
export interface AuthUser extends User {
  // 扩展用户信息
}

export interface AuthSession extends Session {
  // 扩展会话信息
}

// API 响应类型
export interface AuthResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  user?: AuthUser
}

// 登录方式枚举
export const LoginMode = {
  PASSWORD: 'password',
  REGISTER: 'register',
  OTP: 'otp',
} as const

export type LoginModeType = typeof LoginMode[keyof typeof LoginMode]

// 用户元数据类型
export interface UserMetadata {
  name?: string
  avatar?: string
  [key: string]: any
}

// OTP 相关类型
export interface OTPRequest {
  email: string
  type?: 'signup' | 'magiclink' | 'recovery'
}

export interface OTPVerification {
  email: string
  token: string
  type?: 'signup' | 'magiclink' | 'recovery'
}

// 数据库操作相关类型
export interface DatabaseResponse<T = any> {
  data: T[] | null
  error: string | null
}

export interface DatabaseOptions {
  select?: string
  filter?: Record<string, any>
  order?: { column: string, ascending?: boolean }
  limit?: number
  offset?: number
}

// 文件存储相关类型
export interface FileUploadOptions {
  bucket: string
  path: string
  file: File
  options?: {
    cacheControl?: string
    contentType?: string
    upsert?: boolean
  }
}

export interface FileDownloadOptions {
  bucket: string
  path: string
  transform?: {
    width?: number
    height?: number
    quality?: number
  }
}

// 实时订阅相关类型
export interface RealtimeSubscriptionOptions {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
}

export interface RealtimePayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
  errors: any[]
}

// 扩展配置类型
export interface SupabaseExtensionConfig {
  autoInit: boolean
  enableRealtime: boolean
  debug: boolean
}
