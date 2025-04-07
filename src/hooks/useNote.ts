import type { Note } from './useDexie'
import { nanoid } from 'nanoid'
import { onUnmounted, ref } from 'vue'
import { useDexie } from './useDexie'

type UpdateFn = (item: Note) => void

const notes = ref<Note[]>([])
let initializing = false
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
  const time = Math.floor(Date.now() / 1000)
  if (!isInitialized && !initializing) {
    initializing = true
    fetchNotes().then(() => {
      if (notes.value.length === 0) {
        const id1 = {
          id: 1,
          uuid: nanoid(12),
          title: '备忘录',
          ftitle: 'default-folder',
          newstime: time,
          newstext: '',
          type: 'folder',
          puuid: '',
          lastdotime: time,
        } as Note
        addNote(id1).then(() => {
          fetchNotes().then(() => {
            isInitialized = true
            notifyNoteUpdate(id1)
          })
        })
      }
      else {
        isInitialized = true
      }
      initializing = false
    })
  }

  async function syncNote() {}

  function getFirstNote() {
    return db.value.notes.orderBy('newstime').first()
  }

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

  async function getNote(uuid: string) {
    const r = await db.value.notes.where('uuid').equals(uuid).first()
    return r
  }

  async function deleteNote(uuid: string) {
    console.log('deleteNote', uuid)
    await db.value.notes.where('uuid').equals(uuid).delete()
    fetchNotes()
  }

  async function updateNote(uuid: string, note: any) {
    await db.value.notes.put(note, uuid)
    fetchNotes()
  }

  async function getNotesByPUuid(puuid: string) {
    const r = await db.value.notes.where('puuid').equals(puuid).toArray()
    return r
  }

  async function getNoteCountByUuid(puuid: string) {
    // 获取当前 puuid 下的所有分类
    const categories = await db.value.notes.where('puuid').equals(puuid).toArray()

    let count = 0

    // 遍历所有分类
    for (const category of categories) {
      // 如果是笔记类型，计数加1
      if (category.type === 'note') {
        count++
      }
      // 如果是文件夹类型，递归获取其中的笔记数量
      else if (category.type === 'folder') {
        count += await getNoteCountByUuid(category.uuid!)
      }
    }

    return count
  }

  function onUpdateNote(fn: UpdateFn) {
    onNoteUpdateArr.push(fn)
    privateNoteUpdateArr.push(fn)
  }

  function getNotesByLastdotime(lastdotime: number) {
    return db.value.notes.where('lastdotime').aboveOrEqual(lastdotime).toArray()
  }

  onUnmounted(() => {
    privateNoteUpdateArr.forEach((fn) => {
      onNoteUpdateArr.splice(onNoteUpdateArr.indexOf(fn), 1)
    })
  })

  return {
    getFirstNote,
    notes,
    syncNote,
    fetchNotes,
    addNote,
    getNote,
    deleteNote,
    updateNote,
    getNotesByPUuid,
    getNoteCountByUuid,
    getNotesByLastdotime,
    onUpdateNote,
  }
}
