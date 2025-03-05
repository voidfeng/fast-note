import { ref } from 'vue'
import { useDexie } from './useDexie'

const categorys = ref([])
let isInitialized = false

export function useCategory() {
  if (!isInitialized) {
    const { db, init } = useDexie()
    init()
    db.value.categorys
      .orderBy('newstime') // 按 newstime 排序
      .reverse() // 倒序排列
      .toArray() // 将结果转换为数组
      .then((data) => {
        categorys.value = data
      })
      .catch((error) => {
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
