import { onUnmounted, ref } from 'vue'
import { Note, useDexie } from './useDexie'

type UpdateFn = (item: Note) => void

const notes = ref<Note[]>([])
let isInitialized = false
const onNoteUpdateArr: UpdateFn[] = []

function notifyNoteUpdate(item: Note) {
  onNoteUpdateArr.forEach((fn) => {
    fn(item)
  })
}

export function useNote() {
  const { db } = useDexie()
  const privateNoteUpdateArr: UpdateFn[] = []

  if (!isInitialized) {
    fetchNotes().then(() => {
      if (notes.value.length === 0) {
        const id1 = {
          id: 1,
          title: '备忘录',
          newstime: Date.now(),
          newstext: '',
          type: 'folder',
          pid: 0,
        } as Note
        addNote(id1).then(() => {
          fetchNotes().then(() => {
            isInitialized = true
            notifyNoteUpdate(id1)
          })
        })
      } else {
        isInitialized = true
      }
    })
  }

  async function syncNote() {}

  function fetchNotes() {
    return db.value.notes
      .orderBy('newstime') // 按 newstime 排序
      .toArray() // 将结果转换为数组
      .then((data: Note[]) => {
        notes.value = data
      })
      .catch((error: any) => {
        console.error('Error fetching data:', error)
      })
  }

  async function addNote(note: any) {
    const r = await db.value.notes.add(note)
    fetchNotes()
    return r
  }

  async function getNote(id: number) {
    const r = await db.value.notes.get(id)
    return r
  }

  async function deleteNote(id: number) {
    await db.value.notes.delete(id)
    fetchNotes()
  }

  async function updateNote(id: number, note: any) {
    await db.value.notes.put(note, id)
    fetchNotes()
  }

  async function getNotesByPid(pid: number) {
    const r = await db.value.notes.where('pid').equals(pid).toArray()
    return r
  }

  async function getNoteCountByPid(pid: number) {
    // 获取当前 pid 下的所有分类
    const categories = await db.value.notes.where('pid').equals(pid).toArray()

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

  function onUpdateNote(fn: UpdateFn) {
    onNoteUpdateArr.push(fn)
    privateNoteUpdateArr.push(fn)
  }

  onUnmounted(() => {
    privateNoteUpdateArr.forEach((fn) => {
      onNoteUpdateArr.splice(onNoteUpdateArr.indexOf(fn), 1)
    })
  })

  return {
    notes,
    syncNote,
    fetchNotes,
    addNote,
    getNote,
    deleteNote,
    updateNote,
    getNotesByPid,
    getNoteCountByPid,
    onUpdateNote,
  }
}
