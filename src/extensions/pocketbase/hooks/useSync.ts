import type { Note } from '@/types'
import { ref } from 'vue'
import { useNoteFiles } from '@/hooks/useNoteFiles'
import { useNote } from '@/stores'
import { getTime } from '@/utils/date'
import { notesApi } from '../api/client'

const defaultUpdated = JSON.stringify(getTime('2010/01/01 00:00:00'))
const updated = ref(JSON.parse(localStorage.pocketbaseUpdated || defaultUpdated))

const syncing = ref(false)
// 存储同步成功的回调函数
const syncSyncedCallbacks: Array<(result?: any) => void> = []

export function useSync() {
  const { getNotesByUpdated, getNote, addNote, deleteNote, updateNote } = useNote()
  const { getNoteFileByHash } = useNoteFiles()

  /**
   * 从笔记内容中提取文件hash
   */
  function extractFileHashesFromContent(content: string): string[] {
    // 提取 file-upload 元素的 url 属性（即hash值）
    const fileHashRegex = /<file-upload[^>]+url="([^"]+)"/g
    const fileHashes: string[] = []
    let match = fileHashRegex.exec(content)

    while (match !== null) {
      fileHashes.push(match[1])
      match = fileHashRegex.exec(content)
    }

    return fileHashes
  }

  /**
   * 检查字符串是否为SHA256 hash值（64位十六进制）
   */
  function isHashValue(str: string): boolean {
    return /^[a-f0-9]{64}$/i.test(str)
  }

  /**
   * 处理笔记的文件收集
   */
  async function handleNoteFiles(note: Note): Promise<{ note: Note, filesForUpload: Array<File | string> }> {
    if (!note.content) {
      return { note: { ...note, files: [] }, filesForUpload: [] }
    }

    // 从内容中提取文件hash
    const contentHashes = extractFileHashesFromContent(note.content)

    if (contentHashes.length === 0) {
      return { note: { ...note, files: [] }, filesForUpload: [] }
    }

    // 处理文件：hash转换为File对象，pocketbase文件名保持不变
    const filesForUpload: Array<File | string> = []

    for (const hashOrFilename of contentHashes) {
      try {
        // 判断是hash值还是pocketbase文件名
        if (isHashValue(hashOrFilename)) {
          // 是hash值，尝试获取本地文件
          const localFile = await getNoteFileByHash(hashOrFilename)

          if (localFile && localFile.file) {
            // 本地文件存在，添加File对象到上传列表
            filesForUpload.push(localFile.file)
          }
          else {
            console.warn(`本地文件未找到: ${hashOrFilename}`)
            // 如果本地文件不存在，跳过该文件（避免上传无效数据）
          }
        }
        else {
          // 不是hash值，认为是pocketbase文件名，直接保留
          filesForUpload.push(hashOrFilename)
        }
      }
      catch (error) {
        console.error(`处理文件失败: ${hashOrFilename}`, error)
        // 发生错误时，如果不是hash值则保留，避免丢失pocketbase文件
        if (!isHashValue(hashOrFilename)) {
          filesForUpload.push(hashOrFilename)
        }
      }
    }

    return {
      note: { ...note, files: contentHashes }, // 保持原始的hash/文件名数组
      filesForUpload, // 转换后的文件数组（File对象 + pocketbase文件名）
    }
  }

  // 注册同步成功的回调函数
  function onSynced(callback: (result?: any) => void) {
    if (typeof callback === 'function') {
      syncSyncedCallbacks.push(callback)
    }

    // 返回取消注册的函数
    return () => offOnSynced(callback)
  }

  // 移除同步成功的回调函数
  function offOnSynced(callback: (result?: any) => void) {
    const index = syncSyncedCallbacks.indexOf(callback)
    if (index !== -1) {
      syncSyncedCallbacks.splice(index, 1)
    }
  }

  // 触发同步成功的回调函数
  function triggerSyncedCallbacks(result?: any) {
    for (const callback of syncSyncedCallbacks) {
      try {
        callback(result)
      }
      catch (error) {
        console.error('执行同步成功回调函数失败:', error)
      }
    }
  }

  // 主同步函数
  async function sync() {
    syncing.value = true

    try {
      const result = await syncNote()
      triggerSyncedCallbacks(result)
      return result
    }
    catch (error) {
      console.error('PocketBase同步失败', error)
      throw error // 重新抛出错误，停止同步
    }
    finally {
      syncing.value = false
    }
  }

  // 同步备忘录
  async function syncNote() {
    console.warn('PocketBase同步开始，updated:', updated.value)

    // 获取本地变更数据
    const localNotes = await getNotesByUpdated(updated.value)
    console.warn('本地笔记变更:', localNotes)

    // 获取云端变更数据
    const cloudNotes = await notesApi.getNotesByUpdated(updated.value)
    console.warn('云端笔记变更:', cloudNotes)

    // content 转义处理（PocketBase可能也需要）
    cloudNotes.d.forEach((note: any) => {
      if (note.content) {
        note.content = note.content.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      }
    })

    // 创建ID映射以便快速查找
    const localNotesMap = new Map(localNotes.map(note => [note.id, note]))
    const cloudNotesMap = new Map((cloudNotes.d as Note[]).map(note => [note.id, note]))

    // 准备需要处理的操作列表
    interface SyncOperation {
      note: Note
      action: 'upload' | 'update' | 'download' | 'delete' | 'deleteLocal'
    }

    const operations: SyncOperation[] = []
    const now = Date.now()
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000 // 30天的毫秒数

    // 处理本地笔记
    for (const note of localNotes) {
      const cloudNote = cloudNotesMap.get(note.id)

      // 处理本地已删除的笔记
      if (note.is_deleted === 1) {
        // 如果删除时间超过30天
        if (now - new Date(note.updated).getTime() > thirtyDaysInMs) {
          // 从本地删除
          operations.push({ note, action: 'deleteLocal' })

          // 如果云端有此笔记，请求云端删除
          if (cloudNote) {
            const noteToUpdate = { ...note }
            operations.push({ note: noteToUpdate, action: 'delete' })
          }
          continue
        }

        // 如果删除时间在30天内
        // 如果云端不存在此笔记，上传删除状态到云端
        if (!cloudNote) {
          operations.push({ note, action: 'upload' })
          continue
        }

        // 如果本地时间更新，上传删除状态到云端
        const localTime = new Date(note.updated).getTime()
        const cloudTime = new Date(cloudNote.updated).getTime()

        if (localTime > cloudTime) {
          const noteToUpdate = { ...note }
          operations.push({ note: noteToUpdate, action: 'update' })
        }
        continue
      }

      // 处理未删除的笔记
      if (!cloudNote) {
        // 本地存在但云端不存在 - 上传到云端
        operations.push({ note, action: 'upload' })
      }
      else {
        // 本地和云端都存在 - 比较时间戳
        const localTime = new Date(note.updated).getTime()
        const cloudTime = new Date(cloudNote.updated).getTime()

        if (localTime > cloudTime) {
          // 本地版本更新，上传到云端
          const noteToUpdate = { ...note }
          operations.push({ note: noteToUpdate, action: 'update' })
        }
        else if (localTime < cloudTime) {
          // 云端版本更新，下载到本地
          operations.push({ note: cloudNote, action: 'download' })
        }
      }
    }

    // 处理云端笔记
    for (const note of cloudNotes.d as Note[]) {
      const localNote = localNotesMap.get(note.id)

      // 处理云端已删除的笔记
      if (note.is_deleted === 1) {
        // 如果删除时间超过30天且本地存在，从本地删除
        if (now - new Date(note.updated).getTime() > thirtyDaysInMs) {
          if (localNote) {
            operations.push({ note, action: 'deleteLocal' })
          }
          continue
        }

        // 如果本地不存在且删除时间在30天内，下载到本地
        if (!localNote) {
          operations.push({ note, action: 'download' })
          continue
        }

        // 如果本地存在，比较时间戳
        const localTime = new Date(localNote.updated).getTime()
        const cloudTime = new Date(note.updated).getTime()

        if (cloudTime > localTime) {
          // 云端时间更新，更新本地数据
          operations.push({ note, action: 'download' })
        }
        continue
      }

      // 处理未删除的笔记
      if (!localNote) {
        // 云端存在但本地不存在 - 下载到本地
        operations.push({ note, action: 'download' })
      }
      else {
        // 本地和云端都存在 - 比较时间戳
        const localTime = new Date(localNote.updated).getTime()
        const cloudTime = new Date(note.updated).getTime()

        if (cloudTime > localTime) {
          // 云端时间更新，更新本地数据
          operations.push({ note, action: 'download' })
        }
      }
    }

    // 按照updated顺序排序所有操作
    operations.sort((a, b) => new Date(a.note.updated).getTime() - new Date(b.note.updated).getTime())

    // 统计同步结果
    let uploadedCount = 0
    let downloadedCount = 0
    let deletedCount = 0

    // 按顺序执行所有同步操作
    for (const { note, action } of operations) {
      try {
        if (action === 'upload') {
          // 处理文件收集
          const { note: noteWithFiles, filesForUpload } = await handleNoteFiles(note)
          await notesApi.updateNote(noteWithFiles, filesForUpload)
          uploadedCount++
        }
        else if (action === 'update') {
          // 处理文件收集
          const { note: noteWithFiles, filesForUpload } = await handleNoteFiles(note)
          await notesApi.updateNote(noteWithFiles, filesForUpload)
          uploadedCount++
        }
        else if (action === 'download') {
          const localNote = await getNote(note.id)
          if (localNote) {
            await updateNote(note.id, note)
          }
          else {
            await addNote(note)
          }
          downloadedCount++
        }
        else if (action === 'deleteLocal') {
          await deleteNote(note.id)
          deletedCount++
        }
        else if (action === 'delete') {
          // 请求云端删除（标记为删除状态）
          await notesApi.updateNote(note)
          deletedCount++
        }

        // 每成功同步一条记录，就更新updated
        if (new Date(note.updated).getTime() > new Date(updated.value).getTime()) {
          updated.value = note.updated
          localStorage.pocketbaseUpdated = JSON.stringify(note.updated)
        }
      }
      catch (error) {
        console.error(`PocketBase同步操作失败 (${action}):`, error)
        throw error // 停止同步，不再继续处理后续记录
      }
    }

    console.warn('PocketBase同步完成', {
      uploaded: uploadedCount,
      downloaded: downloadedCount,
      deleted: deletedCount,
    })

    return {
      uploaded: uploadedCount,
      downloaded: downloadedCount,
      deleted: deletedCount,
    }
  }

  // 同步状态对象
  const syncStatus = ref({
    isSync: syncing,
    currentStep: '准备同步...',
    progress: 0,
    error: null as string | null,
    lastSyncTime: null as Date | null,
  })

  // 双向同步（别名）
  async function bidirectionalSync() {
    try {
      const result = await sync()
      syncStatus.value.lastSyncTime = new Date()
      syncStatus.value.error = null
      return result
    }
    catch (error) {
      syncStatus.value.error = error instanceof Error ? error.message : '同步失败'
      throw error
    }
  }

  // 全量上传到 PocketBase
  async function fullSyncToPocketBase() {
    try {
      const result = await sync()
      return result
    }
    catch (error) {
      console.error('全量上传失败:', error)
      throw error
    }
  }

  // 获取本地数据统计
  async function getLocalDataStats() {
    const { getNotesByUpdated } = useNote()

    try {
      const notes = await getNotesByUpdated('1970-01-01T00:00:00.000Z')

      return {
        notes: notes?.length || 0,
      }
    }
    catch (error) {
      console.error('获取本地数据统计失败:', error)
      return { notes: 0 }
    }
  }

  // 清空本地数据
  async function clearLocalData() {
    const { deleteNote, getNotesByUpdated } = useNote()

    try {
      // 获取所有本地数据
      const notes = await getNotesByUpdated('1970-01-01T00:00:00.000Z')

      // 删除所有笔记
      for (const note of notes || []) {
        await deleteNote(note.id)
      }

      return true
    }
    catch (error) {
      console.error('清空本地数据失败:', error)
      return false
    }
  }

  return {
    sync,
    syncing,
    onSynced,
    offOnSynced,
    syncStatus,
    bidirectionalSync,
    fullSyncToPocketBase,
    getLocalDataStats,
    clearLocalData,
  }
}
