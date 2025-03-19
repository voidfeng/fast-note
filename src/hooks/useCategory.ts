import { onUnmounted, ref } from 'vue'
import { Category, useDexie } from './useDexie'

type UpdateFn = (item: Category) => void

const categorys = ref<Category[]>([])
let isInitialized = false
const onCategoryUpdateArr: UpdateFn[] = []

function notifyCategoryUpdate(item: Category) {
  onCategoryUpdateArr.forEach((fn) => {
    fn(item)
  })
}

export function useCategory() {
  const { db, init } = useDexie()
  const privateCategoryUpdateArr: UpdateFn[] = []

  if (!isInitialized) {
    init()
    fetchCategorys().then(() => {
      if (categorys.value.length === 0) {
        const id1 = {
          id: 1,
          title: '备忘录',
          newstime: Date.now(),
          newstext: '',
          type: 'folder',
          pid: 0,
        } as Category
        addCategory(id1).then(() => {
          fetchCategorys().then(() => {
            isInitialized = true
            notifyCategoryUpdate(id1)
          })
        })
      } else {
        isInitialized = true
      }
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

  async function getNoteCountByPid(pid: number) {
    // 获取当前 pid 下的所有分类
    const categories = await db.value.categorys.where('pid').equals(pid).toArray()

    let count = 0

    // 遍历所有分类
    for (const category of categories) {
      // 如果是笔记类型，计数加1
      if (category.type === 'note') {
        count++
      }
      // 如果是文件夹类型，递归获取其中的笔记数量
      else if (category.type === 'folder') {
        count += await getNoteCountByPid(category.id!)
      }
    }

    return count
  }

  function onUpdateCategory(fn: UpdateFn) {
    onCategoryUpdateArr.push(fn)
    privateCategoryUpdateArr.push(fn)
  }

  onUnmounted(() => {
    privateCategoryUpdateArr.forEach(fn => {
      onCategoryUpdateArr.splice(onCategoryUpdateArr.indexOf(fn), 1)
    })
  })

  return {
    categorys,
    syncCategory,
    fetchCategorys,
    addCategory,
    getCategory,
    deleteCategory,
    updateCategory,
    getCategorysByPid,
    getNoteCountByPid,
    onUpdateCategory,
  }
}
