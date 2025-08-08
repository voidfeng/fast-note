import type { Note } from '@/types'
import { onUnmounted, ref } from 'vue'
import { noteService } from '@/services/noteService'
import { getTime } from '@/utils/date'
import { errorHandler, ErrorType, withErrorHandling } from '@/utils/errorHandler'
import { useDexie } from './useDexie'

type UpdateFn = (item: Note) => void

const notes = ref<Note[]>([])
let initializing = false
let isInitialized = false
const onNoteUpdateArr: UpdateFn[] = []

export function useNote() {
  const { db } = useDexie()
  const privateNoteUpdateArr: UpdateFn[] = []
  if (!isInitialized && !initializing) {
    initializing = true
    fetchNotes().then(() => {
      isInitialized = true
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
    const { data, error } = await withErrorHandling(
      () => noteService.createNote(note),
      ErrorType.DATABASE,
    )

    if (error) {
      console.error('添加笔记失败:', errorHandler.getUserFriendlyMessage(error))
      throw error
    }

    await fetchNotes()
    return data
  }

  async function getNote(uuid: string) {
    const { data, error } = await withErrorHandling(
      () => noteService.getNote(uuid),
      ErrorType.DATABASE,
    )

    if (error) {
      console.error('获取笔记失败:', errorHandler.getUserFriendlyMessage(error))
      return null
    }

    return data
  }

  async function deleteNote(uuid: string) {
    const { error } = await withErrorHandling(
      () => noteService.deleteNote(uuid),
      ErrorType.DATABASE,
    )

    if (error) {
      console.error('删除笔记失败:', errorHandler.getUserFriendlyMessage(error))
      throw error
    }

    await fetchNotes()
  }

  async function updateNote(uuid: string, updates: any) {
    const { error } = await withErrorHandling(
      () => noteService.updateNote(uuid, updates),
      ErrorType.DATABASE,
    )

    if (error) {
      console.error('更新笔记失败:', errorHandler.getUserFriendlyMessage(error))
      throw error
    }

    await fetchNotes()
  }

  async function getAllFolders() {
    return db.value.note.where('type').equals('folder').and(item => item.isdeleted !== 1).toArray()
  }

  async function getNotesByPUuid(puuid: string) {
    if (puuid === 'allnotes') {
      return db.value.note.where('type').equals('note').and(item => item.isdeleted !== 1).toArray()
    }
    else if (puuid === 'unfilednotes') {
      return db.value.note.where('type').equals('note').and(item => item.puuid === null && item.isdeleted !== 1).toArray()
    }
    else {
      return db.value.note.where('puuid').equals(puuid).and(item => item.isdeleted !== 1).toArray()
    }
  }

  async function getDeletedNotes() {
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString() // 30天前的ISO字符串
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

  function getNotesByLastdotime(lastdotime: string) {
    return db.value.note.where('lastdotime').aboveOrEqual(lastdotime).toArray()
  }

  async function getFolderTreeByPUuid(puuid: string | null = null) {
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

  function getUnfiledNotesCount() {
    return db.value.note
      .where('type')
      .equals('note')
      .and(item => item.puuid === null && item.isdeleted !== 1)
      .count()
  }

  async function searchNotesByPUuid(puuid: string, title: string, keyword: string) {
    // 搜索当前 puuid 下符合条件的笔记
    const directNotes = await db.value.note
      .where('[type+puuid+isdeleted]')
      .equals(['note', puuid, 0])
      .and((item) => {
        if (item.newstext.includes(keyword)) {
          item.folderName = title
          return true
        }
        return false
      })
      .toArray()

    // 获取当前 puuid 下的所有文件夹
    const folders = await db.value.note
      .where('[type+puuid+isdeleted]')
      .equals(['folder', puuid, 0])
      .toArray()

    // 递归搜索每个文件夹中的笔记
    let allMatchedNotes = [...directNotes]

    for (const folder of folders) {
      // 对每个文件夹递归调用搜索方法
      const folderNotes = await searchNotesByPUuid(folder.uuid!, folder.title, keyword)
      allMatchedNotes = [...allMatchedNotes, ...folderNotes]
    }

    return allMatchedNotes
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
    searchNotesByPUuid,
    // 文件夹
    getAllFolders,
    getFolderTreeByPUuid,
    getUnfiledNotesCount,
  }
}
