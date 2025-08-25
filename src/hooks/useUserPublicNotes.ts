import type { Table } from 'dexie'
import type { FolderTreeNode, Note } from '@/types'
import Dexie from 'dexie'
import { onUnmounted, ref } from 'vue'
import { getTime } from '@/utils/date'
import { useRefDBSync } from './useRefDBSync'

type UpdateFn = (item: Note) => void

// 用户数据库类
class UserPublicNotesDB extends Dexie {
  notes!: Table<Note>

  constructor(username: string) {
    super(`UserPublicNotes_${username}`)

    this.version(1).stores({
      notes: '&uuid, [type+puuid+isdeleted], title, newstime, type, puuid, newstext, lastdotime, version, isdeleted, subcount',
    })
  }
}

// 全局状态管理 - 每个用户一个独立的状态
const userPublicNotesMap = new Map<string, {
  db: UserPublicNotesDB
  notes: ReturnType<typeof ref<Note[]>>
  initializing: boolean
  isInitialized: boolean
  onNoteUpdateArr: UpdateFn[]
  notesSync: ReturnType<typeof useRefDBSync<Note>> | null
}>()

// 获取或创建用户状态
function getUserState(username: string) {
  if (!userPublicNotesMap.has(username)) {
    userPublicNotesMap.set(username, {
      db: new UserPublicNotesDB(username),
      notes: ref<Note[]>([]),
      initializing: false,
      isInitialized: false,
      onNoteUpdateArr: [],
      notesSync: null,
    })
  }
  return userPublicNotesMap.get(username)!
}

// 全局初始化函数
export async function initializeUserPublicNotes(username: string) {
  const state = getUserState(username)

  if (!state.isInitialized && !state.initializing) {
    state.initializing = true
    try {
      // 打开用户专用数据库
      await state.db.open()

      // 从数据库读取数据
      const data = await state.db.notes
        .orderBy('newstime')
        .toArray()
      state.notes.value = data

      // 初始化 useRefDBSync
      state.notesSync = useRefDBSync({
        data: state.notes as any,
        table: state.db.notes,
        idField: 'uuid',
        debounceMs: 300,
      })

      state.isInitialized = true
    }
    catch (error) {
      console.error('Error initializing user public notes:', error)
    }
    finally {
      state.initializing = false
    }
  }
}

// 导出同步控制函数
export function getUserPublicNotesSync(username: string) {
  const state = getUserState(username)
  return state.notesSync
}

export function useUserPublicNotes(username: string) {
  const state = getUserState(username)
  const privateNoteUpdateArr: UpdateFn[] = []

  function getFirstNote() {
    const notes = state.notes.value || []
    const sortedNotes = [...notes].sort((a, b) => a.newstime.localeCompare(b.newstime))
    return sortedNotes[0] || null
  }

  function addNote(note: Note) {
    // 确保有 lastdotime 字段用于同步检测
    const noteWithTime = {
      ...note,
      lastdotime: note.lastdotime || getTime(),
    }

    // 直接添加到 notes ref 变量
    if (!state.notes.value) {
      state.notes.value = []
    }
    state.notes.value.push(noteWithTime)
    // 按 newstime 重新排序
    state.notes.value.sort((a, b) => a.newstime.localeCompare(b.newstime))
    return noteWithTime
  }

  function getNote(uuid: string) {
    // 直接从 notes ref 变量获取
    const notes = state.notes.value || []
    const note = notes.find(n => n.uuid === uuid)
    return note || null
  }

  function deleteNote(uuid: string) {
    // 直接从 notes ref 变量删除
    if (!state.notes.value)
      return
    const index = state.notes.value.findIndex(n => n.uuid === uuid)
    if (index > -1) {
      state.notes.value.splice(index, 1)
    }
  }

  function updateNote(uuid: string, updates: any) {
    // 直接更新 notes ref 变量中的数据
    if (!state.notes.value)
      return
    const noteIndex = state.notes.value.findIndex(n => n.uuid === uuid)
    if (noteIndex > -1) {
      // 确保更新 lastdotime 用于同步检测
      const updatedNote = {
        ...state.notes.value[noteIndex],
        ...updates,
        lastdotime: updates.lastdotime || getTime(),
      }
      state.notes.value[noteIndex] = updatedNote
    }
  }

  async function getAllFolders() {
    const notes = state.notes.value || []
    return notes.filter(note => note.type === 'folder' && note.isdeleted !== 1)
  }

  async function getNotesByPUuid(puuid: string) {
    const notes = state.notes.value || []
    if (puuid === 'allnotes') {
      return notes.filter(note => note.type === 'note' && note.isdeleted !== 1)
    }
    else if (puuid === 'unfilednotes') {
      return notes.filter(note => note.type === 'note' && note.puuid === null && note.isdeleted !== 1)
    }
    else {
      return notes.filter(note => note.puuid === puuid && note.isdeleted !== 1)
    }
  }

  async function getDeletedNotes() {
    const notes = state.notes.value || []
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString() // 30天前的ISO字符串
    return notes.filter(note => note.isdeleted === 1 && note.lastdotime >= thirtyDaysAgo)
  }

  async function getNoteCountByUuid(puuid: string) {
    const notes = state.notes.value || []
    // 获取当前 puuid 下的所有分类
    const categories = notes.filter(note => note.puuid === puuid && note.isdeleted !== 1)

    let count = 0

    // 遍历所有分类
    for (const category of categories) {
      // 如果是笔记类型，计数加1
      if (category.type === 'note') {
        count++
      }
      // 如果是文件夹类型，递归获取其中的笔记数量
      else if (category.type === 'folder') {
        count += category.subcount || 0
      }
    }

    return count
  }

  function onUpdateNote(fn: UpdateFn) {
    state.onNoteUpdateArr.push(fn)
    privateNoteUpdateArr.push(fn)
  }

  function getNotesByLastdotime(lastdotime: string) {
    const notes = state.notes.value || []
    return notes.filter(note => note.lastdotime > lastdotime)
  }

  function getFolderTreeByPUuid(puuid: string | null = null): FolderTreeNode[] {
    /**
     * 先获取全部文件夹，再根据puuid获取对应的文件夹，再递归寻找每个文件夹的子文件夹
     * 使用新的数据结构，不修改原始数据
     */
    const notes = state.notes.value || []
    const allFolders = notes.filter(note => note.type === 'folder' && note.isdeleted !== 1)
    const folders = allFolders.filter(item => item.puuid === puuid)

    if (folders && folders.length > 0) {
      // 递归构建文件夹树
      const buildFolderTree = (currentFolder: Note, allFolders: Note[]): FolderTreeNode => {
        // 创建一个新的树节点，引用原始数据
        const folderNode: FolderTreeNode = {
          children: [],
          originNote: currentFolder,
        }

        const childFolders = allFolders.filter(item => item.puuid === currentFolder.uuid)

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
    const notes = state.notes.value || []
    return notes.filter(note =>
      note.type === 'note'
      && note.puuid === null
      && note.isdeleted !== 1,
    ).length
  }

  async function searchNotesByPUuid(puuid: string, title: string, keyword: string) {
    const notes = state.notes.value || []
    // 搜索当前 puuid 下符合条件的笔记
    const directNotes = notes
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
    const folders = notes.filter(note =>
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
      const notes = state.notes.value || []
      // 获取当前父级文件夹
      const parentFolder: Note | undefined = notes.find(note => note.uuid === currentPuuid)
      if (!parentFolder || parentFolder.type !== 'folder') {
        break
      }

      // 计算当前文件夹下的笔记数量（递归计算）
      const noteCount = await getNoteCountByUuid(currentPuuid)

      // 先获取当前文件夹信息，再更新父级文件夹的 subcount 和 lastdotime
      const currentFolder = notes.find(note => note.uuid === currentPuuid)
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
      state.onNoteUpdateArr.splice(state.onNoteUpdateArr.indexOf(fn), 1)
    })
  })

  return {
    getFirstNote,
    notes: state.notes,
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
    getUserPublicNotesSync: () => state.notesSync,
  }
}
