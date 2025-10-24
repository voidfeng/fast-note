/**
 * 同步核心模块 - 类型定义
 * 定义同步相关的所有类型和接口
 */

/**
 * 同步状态
 */
export enum SyncStatus {
  IDLE = 'idle', // 空闲
  SYNCING = 'syncing', // 同步中
  SUCCESS = 'success', // 同步成功
  FAILED = 'failed', // 同步失败
  CONFLICT = 'conflict', // 存在冲突
}

/**
 * 网络状态
 */
export enum NetworkStatus {
  ONLINE = 'online', // 在线
  OFFLINE = 'offline', // 离线
  RECONNECTING = 'reconnecting', // 重连中
}

/**
 * 同步方向
 */
export enum SyncDirection {
  UPLOAD = 'upload', // 上传到云端
  DOWNLOAD = 'download', // 从云端下载
  BIDIRECTIONAL = 'bidirectional', // 双向同步
}

/**
 * 冲突解决策略
 */
export enum ConflictStrategy {
  LOCAL_WINS = 'local_wins', // 本地优先
  REMOTE_WINS = 'remote_wins', // 云端优先
  TIMESTAMP_WINS = 'timestamp_wins', // 时间戳优先(最后写入)
  MANUAL = 'manual', // 手动解决
}

/**
 * 同步项接口
 */
export interface SyncItem {
  id: string
  updated: Date
  action: 'create' | 'update' | 'delete'
  data: any
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  conflicts: SyncConflict[]
  errors: Error[]
}

/**
 * 同步冲突
 */
export interface SyncConflict {
  itemId: string
  localVersion: any
  remoteVersion: any
  timestamp: Date
  strategy: ConflictStrategy
}

/**
 * WebSocket 消息
 */
export interface WebSocketMessage {
  type: 'create' | 'update' | 'delete' | 'sync'
  data: any
  timestamp: Date
}

/**
 * 同步配置
 */
export interface SyncConfig {
  autoSync: boolean // 是否自动同步
  syncInterval: number // 同步间隔(毫秒)
  debounceDelay: number // 防抖延迟(毫秒)
  maxRetries: number // 最大重试次数
  retryDelay: number // 重试延迟(毫秒)
  batchSize: number // 批量处理大小
  conflictStrategy: ConflictStrategy // 冲突解决策略
}

/**
 * 重试选项
 */
export interface RetryOptions {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffFactor: number
}

/**
 * 同步状态信息
 */
export interface SyncStateInfo {
  status: SyncStatus
  lastSyncTime: Date | null
  needsSync: boolean
  pendingCount: number
}
