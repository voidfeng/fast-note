import type { Note } from '@/types'
import { onUnmounted, ref } from 'vue'
import { getTime } from '@/utils/date'
import { useDexie } from './useDexie'
import { useRefDBSync } from './useRefDBSync'

type UpdateFn = (item: Note) => void

const notes = ref<Note[]>([])
let initializing = false
let isInitialized = false
const onNoteUpdateArr: UpdateFn[] = []

// 全局同步实例
let notesSync: ReturnType<typeof useRefDBSync<Note>> | null = null

// 全局初始化函数
export async function initializeNotes() {
  if (!isInitialized && !initializing) {
    initializing = true
    try {
      const { db } = useDexie()
      const data = await db.value.note
        .orderBy('newstime')
        .toArray()
      notes.value = data

      // 初始化 useRefDBSync
      notesSync = useRefDBSync({
        data: notes,
        table: db.value.note,
        idField: 'uuid',
        debounceMs: 300,
      })

      isInitialized = true
    }
    catch (error) {
      console.error('Error initializing notes:', error)
    }
    finally {
      initializing = false
    }
  }
}

// 导出同步控制函数
export function getNotesSync() {
  return notesSync
}

export function useNote() {
  const { db } = useDexie()
  const privateNoteUpdateArr: UpdateFn[] = []

  function getFirstNote() {
    const sortedNotes = [...notes.value].sort((a, b) => a.newstime.localeCompare(b.newstime))
    return sortedNotes[0] || null
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

  function addNote(note: Note) {
    // 确保有 lastdotime 字段用于同步检测
    const noteWithTime = {
      ...note,
      lastdotime: note.lastdotime || getTime(),
    }

    // 直接添加到 notes ref 变量
    notes.value.push(noteWithTime)
    // 按 newstime 重新排序
    notes.value.sort((a, b) => a.newstime.localeCompare(b.newstime))
    return noteWithTime
  }

  function getNote(uuid: string) {
    // 直接从 notes ref 变量获取
    const note = notes.value.find(n => n.uuid === uuid)
    return note || null
  }

  function deleteNote(uuid: string) {
    // 直接从 notes ref 变量删除
    const index = notes.value.findIndex(n => n.uuid === uuid)
    if (index > -1) {
      notes.value.splice(index, 1)
    }
  }

  function updateNote(uuid: string, updates: any) {
    // 直接更新 notes ref 变量中的数据
    const noteIndex = notes.value.findIndex(n => n.uuid === uuid)
    if (noteIndex > -1) {
      // 确保更新 lastdotime 用于同步检测
      const updatedNote = {
        ...notes.value[noteIndex],
        ...updates,
        lastdotime: updates.lastdotime || getTime(),
      }
      notes.value[noteIndex] = updatedNote
    }
  }

  async function getAllFolders() {
    return notes.value.filter(note => note.type === 'folder' && note.isdeleted !== 1)
  }

  async function getNotesByPUuid(puuid: string) {
    if (puuid === 'allnotes') {
      return notes.value.filter(note => note.type === 'note' && note.isdeleted !== 1)
    }
    else if (puuid === 'unfilednotes') {
      return notes.value.filter(note => note.type === 'note' && note.puuid === null && note.isdeleted !== 1)
    }
    else {
      return notes.value.filter(note => note.puuid === puuid && note.isdeleted !== 1)
    }
  }

  async function getDeletedNotes() {
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString() // 30天前的ISO字符串
    return notes.value.filter(note => note.isdeleted === 1 && note.lastdotime >= thirtyDaysAgo)
  }

  async function getNoteCountByUuid(puuid: string) {
    // 获取当前 puuid 下的所有分类
    const categories = notes.value.filter(note => note.puuid === puuid && note.isdeleted !== 1)

    let count = 0

    // 遍历所有分类
    for (const category of categories) {
      // 如果是笔记类型，计数加1
      if (category.type === 'note') {
        count++
      }
      // 如果是文件夹类型，递归获取其中的笔记数量
      else if (category.type === 'folder') {
        count += category.subcount
      }
    }

    return count
  }

  function onUpdateNote(fn: UpdateFn) {
    onNoteUpdateArr.push(fn)
    privateNoteUpdateArr.push(fn)
  }

  function getNotesByLastdotime(lastdotime: string) {
    return notes.value.filter(note => note.lastdotime > lastdotime)
  }

  async function getFolderTreeByPUuid(puuid: string | null = null) {
    /**
     * 先获取全部文件夹，再根据puuid获取对应的文件夹，再递归寻找每个文件夹的子文件夹
     */
    const allFolders = notes.value.filter(note => note.type === 'folder' && note.isdeleted !== 1)
    const folders = allFolders.filter(item => item.puuid === puuid)

    if (folders && folders.length > 0) {
      // 递归寻找每个文件夹的子文件夹
      const buildFolderTree = async (currentFolder: Note, allFolders: Note[]): Promise<Note> => {
        const children = allFolders.filter(item => item.puuid === currentFolder.uuid)

        if (children.length > 0) {
          currentFolder.children = []
          // 递归处理每个子文件夹
          for (const child of children) {
            const processedChild = await buildFolderTree(child, allFolders)
            currentFolder.children.push(processedChild)
          }
        }

        // 直接使用数据库中的 subcount，无需计算
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

  function getUnfiledNotesCount() {
    return notes.value.filter(note =>
      note.type === 'note'
      && note.puuid === null
      && note.isdeleted !== 1,
    ).length
  }

  async function searchNotesByPUuid(puuid: string, title: string, keyword: string) {
    // 搜索当前 puuid 下符合条件的笔记
    const directNotes = notes.value
      .filter(note =>
        note.type === 'note'
        && note.puuid === puuid
        && note.isdeleted === 0
        && note.newstext.includes(keyword),
      )
      .map(note => ({
        ...note,
        folderName: title,
      }))

    // 获取当前 puuid 下的所有文件夹
    const folders = notes.value.filter(note =>
      note.type === 'folder'
      && note.puuid === puuid
      && note.isdeleted === 0,
    )

    // 递归搜索每个文件夹中的笔记
    let allMatchedNotes = [...directNotes]

    for (const folder of folders) {
      // 对每个文件夹递归调用搜索方法
      const folderNotes = await searchNotesByPUuid(folder.uuid!, folder.title, keyword)
      allMatchedNotes = [...allMatchedNotes, ...folderNotes]
    }

    return allMatchedNotes
  }

  /**
   * 递归更新父级数量统计 subcount 字段
   * @param note 当前Note
   * @returns void
   */
  async function updateParentFolderSubcount(note: Note) {
    if (!note || !note.puuid) {
      return // 如果没有父级，直接返回
    }

    let currentPuuid: string | null = note.puuid

    // 递归更新所有父级文件夹的 noteCount
    while (currentPuuid) {
      // 获取当前父级文件夹
      const parentFolder: Note | undefined = notes.value.find(note => note.uuid === currentPuuid)
      if (!parentFolder || parentFolder.type !== 'folder') {
        break
      }

      // 计算当前文件夹下的笔记数量（递归计算）
      const noteCount = await getNoteCountByUuid(currentPuuid)

      // 先获取当前文件夹信息，再更新父级文件夹的 subcount 和 lastdotime
      const currentFolder = notes.value.find(note => note.uuid === currentPuuid)
      if (currentFolder) {
        updateNote(currentPuuid, {
          subcount: noteCount,
          lastdotime: getTime(),
        })
      }

      // 继续向上查找父级
      currentPuuid = parentFolder.puuid
    }
  }

  onUnmounted(() => {
    privateNoteUpdateArr.forEach((fn) => {
      onNoteUpdateArr.splice(onNoteUpdateArr.indexOf(fn), 1)
    })
  })

  return {
    getFirstNote,
    notes,
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
    searchNotesByPUuid,
    // 文件夹
    getAllFolders,
    getFolderTreeByPUuid,
    getUnfiledNotesCount,
    updateParentFolderSubcount,
    // 同步相关
    getNotesSync: () => notesSync,
  }
}
