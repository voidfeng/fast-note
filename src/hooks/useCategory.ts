import { ref } from 'vue'
import { Category, useDexie } from './useDexie'

const categorys = ref<Category[]>([])
let isInitialized = false

export function useCategory() {
  if (!isInitialized) {
    const { db, init } = useDexie()
    init()
    db.value.categorys
      .orderBy('newstime') // 按 newstime 排序
      .reverse() // 倒序排列
      .toArray() // 将结果转换为数组
      .then((data: Category[]) => {
        categorys.value = data
      })
      .catch((error: any) => {
        console.error('Error fetching data:', error)
      })
    isInitialized = true
  }

  async function syncCategory() {}

  return {
    categorys,
    syncCategory,
  }
}
