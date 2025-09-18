import type { Ref } from 'vue'
import type { Metadata, Note, NoteFile, UserInfo } from './types'
import Dexie from 'dexie'
import { ref } from 'vue'

interface NoteDatabase extends Dexie {
  notes: Dexie.Table<Note, string>
  note_files: Dexie.Table<NoteFile, string> // 笔记文件关联表
  // 添加新表
  user_info: Dexie.Table<UserInfo, string>
  metadata: Dexie.Table<Metadata, string>
  // 动态添加的用户公开笔记表将在运行时创建
  [key: string]: any
}

const db = ref<NoteDatabase>()
const onNoteUpdateArr: (() => void)[] = []
let dbInitialized = false

/**
 * 全局数据库初始化函数
 */
export async function initializeDatabase() {
  if (!dbInitialized && !db.value) {
    db.value = new Dexie('note') as NoteDatabase;
    (window as any).db = db.value

    // 数据库结构定义（使用数字枚举的item_type）
    db.value.version(1).stores({
      notes: '&id, [item_type+parent_id+is_deleted], title, created, item_type, parent_id, content, updated, version, is_deleted, note_count, files',
      note_files: '&hash, fileName, fileSize, fileType, created, updated', // 文件存储表
      user_info: '&id, username, name',
      metadata: '&key, value',
    })

    await db.value.open()
    dbInitialized = true
  }
}

/**
 * 辅助函数：将数字转换为布尔值
 */
export function toBool(value: boolean | 0 | 1 | undefined): boolean {
  if (typeof value === 'boolean')
    return value
  return value === 1
}

/**
 * 辅助函数：将布尔值转换为数字（用于数据库存储和查询）
 */
export function toNumber(value: boolean | 0 | 1 | undefined): 0 | 1 {
  if (typeof value === 'number')
    return value as 0 | 1
  return value ? 1 : 0
}

/**
 * 使用 Dexie 数据库的组合式函数
 */
export function useDexie() {
  const privateNoteUpdateArr: (() => void)[] = []

  function onNoteUpdate(fn: () => void) {
    onNoteUpdateArr.push(fn)
    privateNoteUpdateArr.push(fn)
  }

  return {
    db: db as Ref<NoteDatabase>,
    onNoteUpdate,
  }
}
