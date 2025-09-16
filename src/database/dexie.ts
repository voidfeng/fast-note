import type { Ref } from 'vue'
import type { FileRef, Metadata, Note, TypedFile, UserInfo } from './types'
import Dexie from 'dexie'
import { ref } from 'vue'
import { NOTE_TYPE } from '@/types'

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

    // 版本1：原始结构
    db.value.version(1).stores({
      notes: '&id, [item_type+parent_id+is_deleted], title, newstime, item_type, parent_id, content, updated, version, is_deleted, note_count',
      files: '&hash, id, url, updated',
      note_files: '[hash+refid], hash, refid, updated',
      user_info: '&id, username, name',
      metadata: '&key, value',
    })

    // 版本2：迁移 item_type 从字符串到数字枚举
    db.value.version(2).stores({
      notes: '&id, [item_type+parent_id+is_deleted], title, newstime, item_type, parent_id, content, updated, version, is_deleted, note_count',
      files: '&hash, id, url, updated',
      note_files: '[hash+refid], hash, refid, updated',
      user_info: '&id, username, name',
      metadata: '&key, value',
    }).upgrade((trans) => {
      // 迁移现有数据，将字符串类型转换为数字枚举
      return trans.table('notes').toCollection().modify((note) => {
        if (typeof note.item_type === 'string') {
          if (note.item_type === 'folder') {
            note.item_type = NOTE_TYPE.FOLDER
          }
          else if (note.item_type === 'note') {
            note.item_type = NOTE_TYPE.NOTE
          }
        }
      })
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
