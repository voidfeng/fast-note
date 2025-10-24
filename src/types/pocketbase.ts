/**
 * PocketBase 相关类型定义
 */
import type { UserInfo } from '@/types'

/**
 * 公开用户信息
 */
export interface PublicUserInfo {
  id: string
  avatar: string
  username: string
}

/**
 * 认证响应接口
 */
export interface AuthResponse {
  success: boolean
  error?: string
  user?: UserInfo
  token?: string
}

/**
 * Realtime 连接状态
 */
export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

/**
 * Realtime 事件类型
 */
export interface RealtimeEvent<T = any> {
  action: 'create' | 'update' | 'delete'
  record: T
}

/**
 * Realtime 配置
 */
export interface RealtimeConfig {
  autoReconnect?: boolean
  onStatusChange?: (status: RealtimeStatus) => void
  onError?: (error: Error) => void
  onMessage?: (event: RealtimeEvent) => void
}
