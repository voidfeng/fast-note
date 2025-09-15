/**
 * 统一的类型定义文件
 */

// 笔记类型枚举
export const NOTE_TYPE = {
  FOLDER: 1, // 文件夹
  NOTE: 2, // 笔记
} as const

export type NoteType = typeof NOTE_TYPE[keyof typeof NOTE_TYPE]

// 基础笔记类型
export interface Note {
  id: string
  title: string
  summary?: string
  newstime: string
  content: string
  item_type: NoteType
  parent_id: string | null
  updated: string
  version?: number
  is_deleted: number
  is_locked: number
  is_public?: boolean
  note_count: number
  children?: Note[]
  folderName?: string
  user_id?: string
  created_at?: string
}

// 笔记详情类型
export interface NoteDetail extends Note {
  folderName?: string
}

// 文件类型
export interface TypedFile {
  localId?: string
  path?: string
  file?: File
  hash: string
  id?: number
  is_deleted?: 0 | 1
  updated: string
  user_id?: string
}

// 文件引用类型
export interface FileRef {
  id?: number
  hash: string
  refid: string
  updated: string
  is_deleted?: 0 | 1
  user_id?: string
}

// 用户信息类型
export interface UserInfo {
  id?: string
  username?: string
  email?: string
  avatar?: string
  createdAt?: number
  updatedAt?: number
}

// 同步状态类型
export interface SyncState {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime?: number
  syncError?: string
}

// 编辑器配置类型
export interface EditorConfig {
  readOnly?: boolean
  placeholder?: string
  autofocus?: boolean
  spellcheck?: boolean
}

// 搜索结果类型
export interface SearchResult {
  notes: Note[]
  total: number
  keyword: string
}

// 文件夹树节点类型 - 新的数据结构
export interface FolderTreeNode {
  children: FolderTreeNode[]
  originNote: Note // 引用原始笔记对象
  folderName?: string
}

// 旧的文件夹树节点类型（保持向后兼容）
export interface LegacyFolderTreeNode extends Note {
  children?: LegacyFolderTreeNode[]
  expanded?: boolean
  level?: number
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  code?: number
}

// 分页参数类型
export interface PaginationParams {
  page: number
  pageSize: number
  total?: number
}

// 排序参数类型
export interface SortParams {
  field: string
  order: 'asc' | 'desc'
}

// 筛选参数类型
export interface FilterParams {
  type?: NoteType
  isDeleted?: boolean
  dateRange?: {
    start: number
    end: number
  }
}
