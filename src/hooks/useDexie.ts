import Dexie from 'dexie'
import { onUnmounted, Ref, ref } from 'vue'

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

interface NoteDatabase extends Dexie {
  categorys: Dexie.Table<Category, number>
}

const db = ref<NoteDatabase>()
const onCategoryUpdateArr: ((() => void) )[] = []

function notifyCategoryUpdate() {
  onCategoryUpdateArr.forEach(fn => {
    fn()
  })
}

export function useDexie() {

  const privateCategoryUpdateArr: ((() => void) )[] = []
  
  async function init() {
    db.value = new Dexie('note') as NoteDatabase

    // 定义表结构和索引
    db.value.version(1).stores({
      categorys: '++id, title, newstime, type, pid, newstext',
      notes: '++id, title, newstext',
    })

    // 如果分类数据为空，则添加默认分类：备忘录
    const categorys = await db.value.categorys.toArray()
    if (categorys.length === 0) {
      db.value.categorys.add({
        id: 1,
        title: '备忘录',
        newstime: Date.now(),
        newstext: '',
        type: 'folder',
        pid: 0,
      })
      notifyCategoryUpdate()
    }
  }


  function onCategoryUpdate(fn: () => void) {
    onCategoryUpdateArr.push(fn)
    privateCategoryUpdateArr.push(fn)
  }

  onUnmounted(() => {
    privateCategoryUpdateArr.forEach(fn => {
      onCategoryUpdateArr.splice(onCategoryUpdateArr.indexOf(fn), 1)
    })
  })

  return {
    db: db as Ref<NoteDatabase>,
    init,
    onCategoryUpdate,
  }
}
