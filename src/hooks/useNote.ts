import type { Note } from './useDexie'
import { getTime } from '@/utils/date'
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
    return db.value.note.orderBy('newstime').first()
  }

  function fetchNotes() {
    return db.value.note
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
    const r = await db.value.note.add(note)
    fetchNotes()
    return r
  }

  async function getNote(uuid: string) {
    if (uuid === 'allnotes') {
      return Promise.resolve({
        title: '全部备忘录',
        type: 'folder',
        puuid: '',
        uuid: 'allnotes',
      } as Note)
    }
    else {
      return db.value.note.where('uuid').equals(uuid).first()
    }
  }

  async function deleteNote(uuid: string) {
    await db.value.note.where('uuid').equals(uuid).delete()
    fetchNotes()
  }

  async function updateNote(uuid: string, note: any) {
    await db.value.note.put(note, uuid)
    fetchNotes()
  }

  async function getAllFolders() {
    return db.value.note.where('type').equals('folder').and(item => item.isdeleted !== 1).toArray()
  }

  async function getNotesByPUuid(puuid: string) {
    if (puuid === 'allnotes') {
      return db.value.note.where('type').equals('note').and(item => item.isdeleted !== 1).toArray()
    }
    else {
      return db.value.note.where('puuid').equals(puuid).and(item => item.isdeleted !== 1).toArray()
    }
  }

  async function getDeletedNotes() {
    const thirtyDaysAgo = getTime() - (30 * 24 * 60 * 60) // 30天前的时间戳
    return db.value.note.where('isdeleted').equals(1).and(item => item.lastdotime >= thirtyDaysAgo).toArray()
  }

  async function getNoteCountByUuid(puuid: string) {
    // 获取当前 puuid 下的所有分类
    const categories = await db.value.note.where('puuid').equals(puuid).and(item => item.isdeleted !== 1).toArray()

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
    return db.value.note.where('lastdotime').aboveOrEqual(lastdotime).toArray()
  }

  async function getFolderTreeByPUuid(puuid: string = '') {
    /**
     * 先获取全部文件夹，再根据puuid获取对应的文件夹，再递归寻找每个文件夹的子文件夹
     */
    const allFolders = await db.value.note.where('type').equals('folder').and(item => item.isdeleted !== 1).toArray()
    const folders = allFolders.filter(item => item.puuid === puuid)

    if (folders && folders.length > 0) {
      // 递归寻找每个文件夹的子文件夹
      const buildFolderTree = async (currentFolder: Note, allFolders: Note[]): Promise<Note> => {
        // 使用复合索引直接查询，避免加载数据到内存
        const directNoteCount = await db.value.note
          .where('[type+puuid+isdeleted]')
          .equals(['note', currentFolder.uuid, 0])
          .count()

        const children = allFolders.filter(item => item.puuid === currentFolder.uuid)

        // 计算子文件夹中的笔记数量
        let childrenNoteCount = 0
        if (children.length > 0) {
          currentFolder.children = []
          // 递归处理每个子文件夹
          for (const child of children) {
            const processedChild = await buildFolderTree(child, allFolders)
            currentFolder.children.push(processedChild)
            // 累加子文件夹中的笔记数量
            childrenNoteCount += processedChild.noteCount || 0
          }
        }

        // 当前文件夹总笔记数 = 直接包含的笔记 + 子文件夹中的所有笔记
        currentFolder.noteCount = directNoteCount + childrenNoteCount

        return currentFolder
      }

      // 为每个顶层文件夹构建树结构
      const result = []
      for (const folder of folders) {
        const processedFolder = await buildFolderTree(folder, allFolders)
        result.push(processedFolder)
      }
      return result
    }
    return []
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
    getDeletedNotes,
    getNoteCountByUuid,
    getNotesByLastdotime,
    onUpdateNote,
    // 文件夹
    getAllFolders,
    getFolderTreeByPUuid,
  }
}
