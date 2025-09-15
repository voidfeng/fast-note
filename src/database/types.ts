/**
 * 数据库相关类型定义
 */

import type Dexie from 'dexie'
// 重新导出原有类型
// 导入必要的类型
import type { Ref } from 'vue'

export type { FileRef, Note, NoteDetail, TypedFile } from '@/types'

/**
 * 可同步的数据项接口
 */
export interface SyncableItem {
  updated: string
  [key: string]: any
}

/**
 * 用户信息接口
 */
export interface UserInfo {
  id: string
  username: string
  name?: string
}

/**
 * 元数据接口
 */
export interface Metadata {
  key: string
  value: string
}

/**
 * 同步状态
 */
export interface SyncStatus {
  isLoading: boolean
  error: string | null
  lastSyncTime: string | null
}

/**
 * useRefDBSync 配置选项
 */
export interface UseRefDBSyncOptions<T extends SyncableItem> {
  /** 响应式数据源 */
  data: Ref<T[]>
  /** Dexie 表实例 */
  table: Dexie.Table<T, any>
  /** ID 字段名 */
  idField: keyof T
  /** 防抖延迟时间（毫秒） */
  debounceMs?: number
}
