import { ref } from 'vue'
import { useNote } from './useNote'
import { addCloudNote, getCloudNodesByLastdotime, updateCloudNote } from '@/api'
import { getTime } from '@/utils/date'
import { Note } from './useDexie'

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
    
    // 记录最新的lastdotime，用于更新同步时间点
    let newLastdotime = lastdotime.value
    
    // 处理本地存在但云端不存在的数据 - 上传到云端
    const notesToUpload: Note[] = []
    for (const localNote of localNotes) {
      // 更新最新的lastdotime
      if (localNote.lastdotime > newLastdotime) {
        newLastdotime = localNote.lastdotime
      }
      
      if (!cloudNotesMap.has(localNote.uuid)) {
        notesToUpload.push(localNote)
      }
    }
    
    // 处理云端存在但本地不存在的数据 - 下载到本地
    const notesToDownload: Note[] = []
    for (const cloudNote of cloudNotes.d) {
      // 更新最新的lastdotime
      if (cloudNote.lastdotime > newLastdotime) {
        newLastdotime = cloudNote.lastdotime
      }
      
      if (!localNotesMap.has(cloudNote.uuid)) {
        notesToDownload.push(cloudNote)
      }
    }
    
    // 处理本地和云端都存在的数据 - 比较版本号
    const notesToUpdate: Note[] = []
    const localNotesToUpdate: Note[] = []
    
    for (const localNote of localNotes) {
      const cloudNote = cloudNotesMap.get(localNote.uuid)
      if (cloudNote) {
        // 比较版本号
        const localVersion = localNote.version || 0
        const cloudVersion = cloudNote.version || 0
        
        if (localVersion > cloudVersion) {
          // 本地版本更新，上传到云端
          localNote.id = cloudNote.id
          notesToUpdate.push(localNote)
        } else if (cloudVersion > localVersion) {
          // 云端版本更新，更新本地数据
          localNotesToUpdate.push(cloudNote)
        }
      }
    }
    
    // 执行同步操作
    if (notesToUpload.length > 0) {
      await uploadNotesToCloud(notesToUpload)
    }
    
    if (notesToUpdate.length > 0) {
      await updateNotesInCloud(notesToUpdate)
    }
    
    if (notesToDownload.length > 0 || localNotesToUpdate.length > 0) {
      await saveNotesToLocal([...notesToDownload, ...localNotesToUpdate])
    }
    
    // 更新最后同步时间
    lastdotime.value = newLastdotime
    localStorage.lastdotime = JSON.stringify(newLastdotime)
    
    return {
      uploaded: notesToUpload.length + notesToUpdate.length,
      downloaded: notesToDownload.length + localNotesToUpdate.length
    }
  }

  // 辅助函数：上传笔记到云端
  async function uploadNotesToCloud(notes: Note[]) {
    // 这里需要实现上传到云端的API调用
    // 例如: await api.addNotes(notes)
    for (const note of notes) {
      await addCloudNote(note)
    }
  }

  // 辅助函数：更新云端笔记
  async function updateNotesInCloud(notes: Note[]) {
    // 这里需要实现更新云端笔记的API调用
    // 例如: await api.updateNotes(notes)
    for (const note of notes) {
      await updateCloudNote(note)
    }
  }

  // 辅助函数：保存笔记到本地
  async function saveNotesToLocal(notes: Note[]) {
    // 这里需要实现保存到本地IndexedDB的逻辑
    // 例如: await db.notes.bulkPut(notes)
    for (const note of notes) {
      await addNote(note)
    }
  }

  return {
    sync,
  }
}
