import type { TypedFile } from './useDexie'
import { useDexie } from './useDexie'

// 为window.db添加类型声明
declare global {
  interface Window {
    db: any
  }
}

let isInitialized = false
export function useFiles() {
  const { db } = useDexie()
  window.db = db
  if (!isInitialized) {
    isInitialized = true
  }

  function addFile(data: TypedFile) {
    return db.value?.file.add(data)
  }

  function getFile(id: string) {
    return db.value?.file.where('id').equals(id).first()
  }

  function getFileByHash(hash: string) {
    return db.value?.file.get(hash)
  }

  function getFileByUrl(url: string) {
    return db.value?.file.where('url').equals(url).first()
  }

  function getFileByNoteId(noteId: number) {
    return db.value?.file.where('ids').anyOf([noteId]).toArray()
  }

  async function deleteFileByNoteId(noteId: number) {
    const files = await getFileByNoteId(noteId)

    if (!files || files.length === 0)
      return

    for (const file of files) {
      if (file.ids && file.ids.length === 1 && file.ids[0] === noteId) {
        // 如果ids数组中只有这一个noteId，则删除整个文件记录
        if (file.hash) {
          await db.value?.file.delete(file.hash)
        }
      }
      else if (file.ids) {
        // 如果ids数组中还有其他id，则只移除这个noteId
        const updatedIds = file.ids.filter(id => id !== noteId)
        if (file.hash) {
          await db.value?.file.update(file.hash, { ids: updatedIds })
        }
      }
    }
  }

  // 使用hash作为主键删除文件
  function deleteFile(hash: string) {
    return db.value?.file.delete(hash)
  }

  return {
    addFile,
    getFile,
    getFileByHash,
    getFileByUrl,
    getFileByNoteId,
    deleteFile,
    deleteFileByNoteId,
  }
}
