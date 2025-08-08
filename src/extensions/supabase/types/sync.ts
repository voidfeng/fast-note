import type { FileRef, Note, TypedFile } from '@/types'

// 同步状态
export interface SyncStatus {
  isSync: boolean
  progress: number
  currentStep: string
  error?: string
  lastSyncTime?: Date
}

// 同步配置
export interface SyncConfig {
  lastSyncTime: number // 最后同步时间戳
  deletionGracePeriod: number // 删除宽限期（毫秒）
}

// 通用同步操作类型
export interface SyncOperations<T> {
  toUpdate: T[] // 需要更新到本地的
  toInsert: T[] // 需要插入到本地的
  toUpload: T[] // 需要上传到云端的
  toDelete: T[] // 需要软删除的
  toHardDelete: T[] // 需要硬删除的
}

// 笔记同步操作类型
export type NoteSyncOperations = SyncOperations<Note>

// 文件同步操作类型
export type FileSyncOperations = SyncOperations<TypedFile>

// 文件引用同步操作类型
export type FileRefSyncOperations = SyncOperations<FileRef>

// 数据转换器接口
export interface DataConverter<Local, Remote> {
  toLocal: (remote: Remote) => Local
  toRemote: (local: Local) => Remote
}

// 同步处理器接口
export interface SyncHandler<T> {
  getKey: (item: T) => string
  getTimestamp: (item: T) => number
  isDeleted?: (item: T) => boolean
}
