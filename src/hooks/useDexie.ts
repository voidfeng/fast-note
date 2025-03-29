import Dexie from 'dexie'
import { Ref, ref } from 'vue'

// 定义数据库结构

export interface Category {
  id?: number
  title: string
  newstime: number
  newstext: string
  type: 'folder' | 'note'
  pid: number
  noteCount?: number
}

export interface TypedFile {
  ids: number[]
  localId?: string
  url?: string
  file?: File
  id?: number
  hash?: string
}

interface NoteDatabase extends Dexie {
  categorys: Dexie.Table<Category, number>
  files: Dexie.Table<TypedFile, number>
}

const db = ref<NoteDatabase>()
const onCategoryUpdateArr: (() => void)[] = []

export function useDexie() {
  const privateCategoryUpdateArr: (() => void)[] = []

  async function init() {
    db.value = new Dexie('note') as NoteDatabase

    // 定义表结构和索引
    db.value.version(1).stores({
      categorys: '++id, title, newstime, type, pid, newstext, lastdotime, version, uuid',
      files: '++id, url, ids, hash',
    })
  }

  function onCategoryUpdate(fn: () => void) {
    onCategoryUpdateArr.push(fn)
    privateCategoryUpdateArr.push(fn)
  }

  return {
    db: db as Ref<NoteDatabase>,
    init,
    onCategoryUpdate,
  }
}
