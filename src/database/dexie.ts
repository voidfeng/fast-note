import type { Ref } from 'vue'
import type { FileRef, Metadata, Note, NoteDetail, TypedFile, UserInfo } from './types'
import Dexie from 'dexie'
import { ref } from 'vue'

interface NoteDatabase extends Dexie {
  notes: Dexie.Table<Note, string>
  files: Dexie.Table<TypedFile, string>
  note_files: Dexie.Table<FileRef, string>
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

    // 定义表结构和索引，不再需要版本迁移
    db.value.version(1).stores({
      notes: '&uuid, [type+puuid+isdeleted], title, newstime, type, puuid, newstext, lastdotime, version, isdeleted, subcount',
      files: '&hash, id, url, lastdotime',
      note_files: '[hash+refid], hash, refid, lastdotime',
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
