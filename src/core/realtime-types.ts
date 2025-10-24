/**
 * 实时连接服务核心类型定义
 * 定义 Realtime 相关的通用接口，不依赖具体实现
 */

/**
 * Realtime 连接状态
 */
export enum RealtimeStatus {
  DISCONNECTED = 'disconnected', // 未连接
  CONNECTING = 'connecting', // 连接中
  CONNECTED = 'connected', // 已连接
  RECONNECTING = 'reconnecting', // 重连中
  ERROR = 'error', // 错误状态
}

/**
 * Realtime 事件
 */
export interface RealtimeEvent<T = any> {
  action: 'create' | 'update' | 'delete'
  record: T
}

/**
 * Realtime 配置
 */
export interface RealtimeConfig {
  autoReconnect?: boolean // 是否自动重连
  maxReconnectAttempts?: number // 最大重连次数
  reconnectDelay?: number // 重连延迟（毫秒）
  onStatusChange?: (status: RealtimeStatus) => void // 状态变化回调
  onError?: (error: Error) => void // 错误回调
  onMessage?: (event: RealtimeEvent) => void // 消息回调
}

/**
 * Realtime 服务接口
 * 定义所有 Realtime 服务必须实现的方法
 */
export interface IRealtimeService {
  /**
   * 连接到 Realtime
   */
  connect: () => Promise<void>

  /**
   * 断开连接
   */
  disconnect: () => void

  /**
   * 获取当前连接状态
   */
  getStatus: () => RealtimeStatus

  /**
   * 检查是否已连接
   */
  isConnected: () => boolean

  /**
   * 订阅特定集合的变更
   */
  subscribe?: <T = any>(collection: string, callback: (event: RealtimeEvent<T>) => void) => Promise<() => void>
}
