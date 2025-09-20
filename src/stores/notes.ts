import type { FolderTreeNode, Note } from '@/types'
import { onUnmounted, ref } from 'vue'
import { useDexie, useRefDBSync } from '@/database'
import { NOTE_TYPE } from '@/types'
import { getTime } from '@/utils/date'

type UpdateFn = (item: Note) => void

const notes = ref<Note[]>([])
let initializing = false
let isInitialized = false
const onNoteUpdateArr: UpdateFn[] = []

window.notes = notes

// 全局同步实例
let notesSync: ReturnType<typeof useRefDBSync<Note>> | null = null

// 全局初始化函数
export async function initializeNotes() {
  if (!isInitialized && !initializing) {
    initializing = true
    try {
      const { db } = useDexie()
      const data = await db.value.notes
        .orderBy('created')
        .toArray()
      notes.value = data

      // 初始化 useRefDBSync
      notesSync = useRefDBSync({
        data: notes,
        table: db.value.notes,
        idField: 'id',
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
    const sortedNotes = [...notes.value].sort((a, b) => (a.created || '').localeCompare(b.created || ''))
    return sortedNotes[0] || null
  }

  function fetchNotes() {
    return db.value.notes
      .orderBy('created') // 按 created 排序
      .toArray() // 将结果转换为数组
      .then((data: Note[]) => {
        notes.value = data
      })
      .catch((error: any) => {
        console.error('Error fetching data:', error)
      })
  }

  function addNote(note: Note) {
    // 确保有 updated 字段用于同步检测
    const noteWithTime = {
      ...note,
      updated: note.updated || getTime(),
    }

    // 直接添加到 notes ref 变量
    notes.value.push(noteWithTime)
    // 按 created 重新排序
    notes.value.sort((a, b) => (a.created || '').localeCompare(b.created || ''))
    return noteWithTime
  }

  function getNote(id: string) {
    // 直接从 notes ref 变量获取
    const note = notes.value.find(n => n.id === id)
    return note || null
  }

  function deleteNote(id: string) {
    // 直接从 notes ref 变量删除
    const index = notes.value.findIndex(n => n.id === id)
    if (index > -1) {
      notes.value.splice(index, 1)
    }
  }

  function updateNote(id: string, updates: Partial<Note>) {
    // 直接更新 notes ref 变量中的数据
    const noteIndex = notes.value.findIndex(n => n.id === id)
    if (noteIndex > -1) {
      // 确保更新 updated 用于同步检测
      const oldNote = notes.value[noteIndex]
      Object.assign(oldNote, updates, { updated: updates.updated || getTime() })
      notes.value[noteIndex] = oldNote
    }
  }

  async function getAllFolders() {
    return notes.value.filter(note => note.item_type === NOTE_TYPE.FOLDER && note.is_deleted !== 1)
  }

  async function getNotesByParentId(parent_id: string) {
    if (parent_id === 'allnotes') {
      return notes.value.filter(note => note.item_type === NOTE_TYPE.NOTE && note.is_deleted !== 1)
    }
    else if (parent_id === 'unfilednotes') {
      return notes.value.filter(note => note.item_type === NOTE_TYPE.NOTE && note.parent_id === null && note.is_deleted !== 1)
    }
    else {
      return notes.value.filter(note => note.parent_id === parent_id && note.is_deleted !== 1)
    }
  }

  async function getDeletedNotes() {
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString() // 30天前的ISO字符串
    return notes.value.filter(note => note.is_deleted === 1 && note.updated >= thirtyDaysAgo)
  }

  async function getNoteCountByParentId(parent_id: string) {
    // 获取当前 parent_id 下的所有分类
    const categories = notes.value.filter(note => note.parent_id === parent_id && note.is_deleted !== 1)

    let count = 0

    // 遍历所有分类
    for (const category of categories) {
      // 如果是笔记类型，计数加1
      if (category.item_type === NOTE_TYPE.NOTE) {
        count++
      }
      // 如果是文件夹类型，递归获取其中的笔记数量
      else if (category.item_type === NOTE_TYPE.FOLDER) {
        count += category.note_count
      }
    }

    return count
  }

  function onUpdateNote(fn: UpdateFn) {
    onNoteUpdateArr.push(fn)
    privateNoteUpdateArr.push(fn)
  }

  function getNotesByUpdated(updated: string) {
    return notes.value.filter(note => note.updated > updated)
  }

  function getFolderTreeByParentId(parent_id: string | null = ''): FolderTreeNode[] {
    /**
     * 先获取全部文件夹，再根据parent_id获取对应的文件夹，再递归寻找每个文件夹的子文件夹
     * 使用新的数据结构，不修改原始数据
     */
    const allFolders = notes.value.filter(note => note.item_type === NOTE_TYPE.FOLDER && note.is_deleted !== 1)
    const folders = allFolders.filter(item => item.parent_id === parent_id)

    if (folders && folders.length > 0) {
      // 递归构建文件夹树
      const buildFolderTree = (currentFolder: Note, allFolders: Note[]): FolderTreeNode => {
        // 创建一个新的树节点，引用原始数据
        const folderNode: FolderTreeNode = {
          children: [],
          originNote: currentFolder,
        }

        const childFolders = allFolders.filter(item => item.parent_id === currentFolder.id)

        if (childFolders.length > 0) {
          folderNode.children = childFolders.map(child => buildFolderTree(child, allFolders))
        }

        return folderNode
      }

      // 为每个顶层文件夹构建树结构
      return folders.map(folder => buildFolderTree(folder, allFolders))
    }
    return []
  }

  function getUnfiledNotesCount() {
    return notes.value.filter(note =>
      note.item_type === NOTE_TYPE.NOTE
      && note.parent_id === null
      && note.is_deleted !== 1,
    ).length
  }

  async function searchNotesByParentId(parent_id: string, title: string, keyword: string) {
    // 搜索当前 parent_id 下符合条件的笔记
    const directNotes = notes.value
      .filter(note =>
        note.item_type === NOTE_TYPE.NOTE
        && note.parent_id === parent_id
        && note.is_deleted === 0
        && note.content.includes(keyword),
      )
      .map(note => ({
        ...note,
        folderName: title,
      }))

    // 获取当前 parent_id 下的所有文件夹
    const folders = notes.value.filter(note =>
      note.item_type === NOTE_TYPE.FOLDER
      && note.parent_id === parent_id
      && note.is_deleted === 0,
    )

    // 递归搜索每个文件夹中的笔记
    let allMatchedNotes = [...directNotes]

    for (const folder of folders) {
      // 对每个文件夹递归调用搜索方法
      const folderNotes = await searchNotesByParentId(folder.id!, folder.title, keyword)
      allMatchedNotes = [...allMatchedNotes, ...folderNotes]
    }

    return allMatchedNotes
  }

  /**
   * 递归更新父级数量统计 note_count 字段
   * @param note 当前Note
   * @returns void
   */
  async function updateParentFolderSubcount(note: Note) {
    if (!note || !note.parent_id) {
      return // 如果没有父级，直接返回
    }

    let currentParentId: string | null = note.parent_id

    // 递归更新所有父级文件夹的 noteCount
    while (currentParentId) {
      // 获取当前父级文件夹
      const parentFolder: Note | undefined = notes.value.find(note => note.id === currentParentId)
      if (!parentFolder || parentFolder.item_type !== NOTE_TYPE.FOLDER) {
        break
      }

      // 计算当前文件夹下的笔记数量（递归计算）
      const noteCount = await getNoteCountByParentId(currentParentId)

      // 先获取当前文件夹信息，再更新父级文件夹的 note_count 和 updated
      const currentFolder = notes.value.find(note => note.id === currentParentId)
      if (currentFolder) {
        updateNote(currentParentId, {
          note_count: noteCount,
          updated: getTime(),
        })
      }

      // 继续向上查找父级
      currentParentId = parentFolder.parent_id
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
    getNotesByParentId,
    getDeletedNotes,
    getNoteCountByParentId,
    getNotesByUpdated,
    onUpdateNote,
    searchNotesByParentId,
    // 文件夹
    getAllFolders,
    getFolderTreeByParentId,
    getUnfiledNotesCount,
    updateParentFolderSubcount,
    // 同步相关
    getNotesSync: () => notesSync,
  }
}
