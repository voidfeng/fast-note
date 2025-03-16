import { ref } from 'vue'
import { Category, useDexie } from './useDexie'

const categorys = ref<Category[]>([])
let isInitialized = false

export  function useCategory() {
  const { db, init } = useDexie()
  if (!isInitialized) {
    init()
    fetchCategorys().then(() => {
      isInitialized = true
    })
  }

  async function syncCategory() {}

  function fetchCategorys() {
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
    fetchCategorys()
    return r
  }

  async function getCategory(id: number) {
    const r = await db.value.categorys.get(id)
    return r
  }

  async function deleteCategory(id: number) {
    await db.value.categorys.delete(id)
    fetchCategorys()
  }

  async function updateCategory(id: number, note: any) {
    await db.value.categorys.put(note, id)
    fetchCategorys()
  }

  async function getCategorysByPid(pid: number) {
    const r = await db.value.categorys.where('pid').equals(pid).toArray()
    return r
  }

  return {
    categorys,
    syncCategory,
    fetchCategorys,
    addCategory,
    getCategory,
    deleteCategory,
    updateCategory,
    getCategorysByPid,
  }
}
