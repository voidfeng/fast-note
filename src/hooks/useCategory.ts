import { ref } from 'vue'
import { Category, useDexie } from './useDexie'

const categorys = ref<Category[]>([])
let isInitialized = false

export  function useCategory() {
  const { db, init } = useDexie()
  if (!isInitialized) {
    init()
    updateCategorys().then(() => {
      isInitialized = true
    })
  }

  async function syncCategory() {}

  function updateCategorys() {
    return db.value.categorys
      .orderBy('newstime') // 按 newstime 排序
      .toArray() // 将结果转换为数组
      .then((data: Category[]) => {
        categorys.value = data
      })
      .catch((error: any) => {
        console.error('Error fetching data:', error)
      })
  }

  async function addCategory(note: any) {
    const r = await db.value.categorys.add(note)
    updateCategorys()
    return r
  }

  return {
    categorys,
    syncCategory,
    updateCategorys,
    addCategory,
  }
}
