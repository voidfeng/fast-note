import type { Ref } from 'vue'
import type { FileRef, Note, NoteDetail, TypedFile } from '@/types'
import Dexie from 'dexie'
import { ref } from 'vue'

// 重新导出类型，以便其他模块可以从这里导入
export type { FileRef, Note, NoteDetail, TypedFile }

// 用户信息接口
export interface UserInfo {
  id: string
  username: string
  name?: string
}

// 元数据接口
export interface Metadata {
  key: string
  value: string
}

interface NoteDatabase extends Dexie {
  note: Dexie.Table<Note, string>
  file: Dexie.Table<TypedFile, string>
  file_refs: Dexie.Table<FileRef, string>
  // 添加新表
  userInfo: Dexie.Table<UserInfo, string>
  metadata: Dexie.Table<Metadata, string>
  // 动态添加的用户公开笔记表将在运行时创建
  [key: string]: any
}

const db = ref<NoteDatabase>()
const onNoteUpdateArr: (() => void)[] = []

// 辅助函数：将数字转换为布尔值
export function toBool(value: boolean | 0 | 1 | undefined): boolean {
  if (typeof value === 'boolean')
    return value
  return value === 1
}

// 辅助函数：将布尔值转换为数字（用于数据库存储和查询）
export function toNumber(value: boolean | 0 | 1 | undefined): 0 | 1 {
  if (typeof value === 'number')
    return value as 0 | 1
  return value ? 1 : 0
}

export function useDexie() {
  const privateNoteUpdateArr: (() => void)[] = []

  async function init() {
    db.value = new Dexie('note') as NoteDatabase
    ;(window as any).db = db.value
    // 定义表结构和索引
    // 版本 1: 原始版本，lastdotime 为 number
    db.value.version(1).stores({
      note: '&uuid, [type+puuid+isdeleted], title, newstime, type, puuid, newstext, lastdotime, version, isdeleted',
      file: '&hash, id, url, lastdotime',
      file_refs: '[hash+refid], hash, refid, lastdotime',
    })

    // 版本 2: 更新版本，lastdotime 改为 string (ISO 8601)
    db.value.version(2).stores({
      note: '&uuid, [type+puuid+isdeleted], title, newstime, type, puuid, newstext, lastdotime, version, isdeleted',
      file: '&hash, id, url, lastdotime',
      file_refs: '[hash+refid], hash, refid, lastdotime',
    }).upgrade((tx) => {
      // 数据迁移：将现有的时间戳转换为 ISO 8601 字符串
      return tx.table('note').toCollection().modify((note) => {
        if (typeof note.lastdotime === 'number') {
          note.lastdotime = new Date(note.lastdotime * 1000).toISOString()
        }
      }).then(() => {
        return tx.table('file').toCollection().modify((file) => {
          if (typeof file.lastdotime === 'number') {
            file.lastdotime = new Date(file.lastdotime * 1000).toISOString()
          }
        })
      }).then(() => {
        return tx.table('file_refs').toCollection().modify((fileRef) => {
          if (typeof fileRef.lastdotime === 'number') {
            fileRef.lastdotime = new Date(fileRef.lastdotime * 1000).toISOString()
          }
        })
      })
    })

    // 版本 3: 更新版本，newstime 也改为 string (ISO 8601)
    db.value.version(3).stores({
      note: '&uuid, [type+puuid+isdeleted], title, newstime, type, puuid, newstext, lastdotime, version, isdeleted',
      file: '&hash, id, url, lastdotime',
      file_refs: '[hash+refid], hash, refid, lastdotime',
    }).upgrade((tx) => {
      // 数据迁移：将现有的 newstime 时间戳转换为 ISO 8601 字符串
      return tx.table('note').toCollection().modify((note) => {
        if (typeof note.newstime === 'number') {
          note.newstime = new Date(note.newstime * 1000).toISOString()
        }
      })
    })

    // 版本 4: puuid 改造，将空字符串改为 null
    db.value.version(4).stores({
      note: '&uuid, [type+puuid+isdeleted], title, newstime, type, puuid, newstext, lastdotime, version, isdeleted',
      file: '&hash, id, url, lastdotime',
      file_refs: '[hash+refid], hash, refid, lastdotime',
    }).upgrade((tx) => {
      // 数据迁移：将 puuid 的空字符串改为 null
      return tx.table('note').toCollection().modify((note) => {
        if (note.puuid === '') {
          note.puuid = null
        }
      })
    })

    // 版本 5: 添加 userInfo 和 metadata 表
    db.value.version(5).stores({
      note: '&uuid, [type+puuid+isdeleted], title, newstime, type, puuid, newstext, lastdotime, version, isdeleted',
      file: '&hash, id, url, lastdotime',
      file_refs: '[hash+refid], hash, refid, lastdotime',
      userInfo: '&id, username, name',
      metadata: '&key, value',
    })
  }

  function onNoteUpdate(fn: () => void) {
    onNoteUpdateArr.push(fn)
    privateNoteUpdateArr.push(fn)
  }

  return {
    db: db as Ref<NoteDatabase>,
    init,
    onNoteUpdate,
  }
}
