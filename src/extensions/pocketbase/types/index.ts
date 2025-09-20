import type { UserInfo } from '@/types'

export interface PublicUserInfo {
  id: string
  avatar: string
  username: string
}

// 认证响应接口
export interface AuthResponse {
  success: boolean
  error?: string
  user?: UserInfo
  token?: string
}
