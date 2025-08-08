/**
 * 统一的类型定义文件
 */

// 基础笔记类型
export interface Note {
  id?: number
  uuid: string
  title: string
  smalltext: string
  newstime: number
  newstext: string
  type: string
  puuid: string
  lastdotime: number
  version: number
  isdeleted: boolean | 0 | 1
  islocked: 0 | 1
  noteCount?: number
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
  url?: string
  file?: File
  hash: string
  id?: number
  isdeleted?: 0 | 1
  lastdotime: number
  user_id?: string
}

// 文件引用类型
export interface FileRef {
  id?: number
  hash: string
  refid: string
  lastdotime: number
  isdeleted?: 0 | 1
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

// 文件夹树节点类型
export interface FolderTreeNode extends Note {
  children?: FolderTreeNode[]
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
  type?: 'note' | 'folder'
  isDeleted?: boolean
  dateRange?: {
    start: number
    end: number
  }
}
