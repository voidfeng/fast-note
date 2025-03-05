import Dexie from 'dexie'
import { Ref, ref } from 'vue'

// 定义数据库结构

export interface Category {
  id: number
  title: string
  newstime: number
  type: 'folder' | 'note'
  pid: number
}

interface NoteDatabase extends Dexie {
  categorys: Dexie.Table<Category, number>
}

const db = ref<NoteDatabase>()

export function useDexie() {
  function init() {
    db.value = new Dexie('note') as NoteDatabase

    // 定义表结构和索引
    db.value.version(1).stores({
      categorys: '++id, title, newstime, type, pid',
      notes: '++id, title, newstext',
    })

    db.value.categorys.add({
      id: 1,
      title: '全部',
      newstime: Date.now(),
      type: 'folder',
      pid: 0,
    })
  }

  return {
    db: db as Ref<NoteDatabase>,
    init,
  }
}
