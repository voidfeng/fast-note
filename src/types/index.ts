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
  created: string
  content: string
  item_type: NoteType
  parent_id: string
  updated: string
  version?: number
  is_deleted: number
  is_locked: number
  is_public?: boolean
  note_count: number
  files?: string[] // 附件字段，存储文件hash数组
  children?: Note[]
  folderName?: string
  user_id?: string
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

// 文件夹树节点类型 - 新的数据结构
export interface FolderTreeNode {
  children: FolderTreeNode[]
  originNote: Note // 引用原始笔记对象
  folderName?: string
}
