/**
 * 数据库模块统一导出
 */

// 导出 Dexie 相关功能
export {
  initializeDatabase,
  toBool,
  toNumber,
  useDexie,
} from './dexie'

// 导出同步功能
export {
  useRefDBSync,
} from './sync'

// 导出类型
export type {
  Metadata,
  Note,
  SyncableItem,
  SyncStatus,
  TypedFile,
  UseRefDBSyncOptions,
  UserInfo,
} from './types'
