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
    return db.value?.files.add(data)
  }

  function getFile(id: number) {
    return db.value?.files.where('id').equals(id).first()
  }

  function getFileByHash(hash: string) {
    return db.value?.files.get(hash)
  }

  function getFileByNoteId(noteId: number) {
    return db.value?.files.where('ids').anyOf([noteId]).toArray()
  }

  async function deleteFileByNoteId(noteId: number) {
    const files = await getFileByNoteId(noteId)

    if (!files || files.length === 0)
      return

    for (const file of files) {
      if (file.ids.length === 1 && file.ids[0] === noteId) {
        // 如果ids数组中只有这一个noteId，则删除整个文件记录
        await db.value?.files.delete(file.id!)
      }
      else {
        // 如果ids数组中还有其他id，则只移除这个noteId
        const updatedIds = file.ids.filter(id => id !== noteId)
        await db.value?.files.update(file.id!, { ids: updatedIds })
      }
    }
  }

  // 需要添加deleteFile方法，因为在return中有引用
  function deleteFile(id: number) {
    return db.value?.files.delete(id)
  }

  return {
    addFile,
    getFile,
    getFileByHash,
    getFileByNoteId,
    deleteFile,
    deleteFileByNoteId,
  }
}
