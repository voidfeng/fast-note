import type { Note } from './useDexie'
import { addCloudNote, getCloudNodesByLastdotime, updateCloudNote } from '@/api'
import { getTime } from '@/utils/date'
import { ref } from 'vue'
import { useNote } from './useNote'

const lastdotime = ref(JSON.parse(localStorage.lastdotime || getTime('2010/01/01 00:00:00')))

export function useSync() {
  const { getNotesByLastdotime, addNote } = useNote()

  async function sync() {
    // 获取本地变更数据
    const localNotes = await getNotesByLastdotime(lastdotime.value)
    // 获取云端变更数据
    const cloudNotes = await getCloudNodesByLastdotime(lastdotime.value)

    // 创建UUID映射以便快速查找
    const localNotesMap = new Map(localNotes.map(note => [note.uuid, note]))
    const cloudNotesMap = new Map((cloudNotes.d as Note[]).map(note => [note.uuid, note]))

    // 准备需要处理的操作列表
    interface SyncOperation {
      note: Note
      action: 'upload' | 'update' | 'download'
    }

    const operations: SyncOperation[] = []

    // 处理本地笔记
    for (const note of localNotes) {
      const cloudNote = cloudNotesMap.get(note.uuid)
      if (!cloudNote) {
        // 本地存在但云端不存在 - 上传到云端
        operations.push({ note, action: 'upload' })
      }
      else {
        // 本地和云端都存在 - 比较版本号
        const localVersion = note.version || 0
        const cloudVersion = cloudNote.version || 0

        if (localVersion > cloudVersion) {
          // 本地版本更新，上传到云端
          const noteToUpdate = { ...note, id: cloudNote.id }
          operations.push({ note: noteToUpdate, action: 'update' })
        }
      }
    }

    // 处理云端笔记
    for (const note of cloudNotes.d as Note[]) {
      const localNote = localNotesMap.get(note.uuid)
      if (!localNote) {
        // 云端存在但本地不存在 - 下载到本地
        operations.push({ note, action: 'download' })
      }
      else {
        // 本地和云端都存在 - 比较版本号
        const localVersion = localNote.version || 0
        const cloudVersion = note.version || 0

        if (cloudVersion > localVersion) {
          // 云端版本更新，更新本地数据
          operations.push({ note, action: 'download' })
        }
      }
    }

    // 按照lastdotime顺序排序所有操作
    operations.sort((a, b) => a.note.lastdotime - b.note.lastdotime)

    // 统计同步结果
    let uploadedCount = 0
    let downloadedCount = 0

    // 按顺序执行所有同步操作
    for (const { note, action } of operations) {
      try {
        if (action === 'upload') {
          await addCloudNote(note)
          uploadedCount++
        }
        else if (action === 'update') {
          await updateCloudNote(note)
          uploadedCount++
        }
        else if (action === 'download') {
          await addNote(note)
          downloadedCount++
        }

        // 每成功同步一条记录，就更新lastdotime
        if (note.lastdotime > lastdotime.value) {
          lastdotime.value = note.lastdotime
          localStorage.lastdotime = JSON.stringify(note.lastdotime)
        }
      }
      catch (error) {
        console.error(`同步操作失败 (${action}):`, error)
        // 继续处理下一条记录
      }
    }

    return {
      uploaded: uploadedCount,
      downloaded: downloadedCount,
    }
  }

  return {
    sync,
  }
}
