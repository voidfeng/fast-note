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
  localId: string
  name: string
  type: string
  url: string
  blob: Blob
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
      categorys: '++id, title, newstime, type, pid, newstext',
      files: '++id, localId, type, url',
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
