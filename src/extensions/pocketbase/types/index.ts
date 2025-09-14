// PocketBase 用户信息接口
export interface UserInfo {
  id: string
  email: string
  name?: string
  avatar?: string
  username?: string
  created: string
  updated: string
}

// 认证响应接口
export interface AuthResponse {
  success: boolean
  error?: string
  user?: UserInfo
  token?: string
}
