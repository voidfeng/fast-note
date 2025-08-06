import type { TypedFile } from '@/types'
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
    // 通过 file_refs 表来查找与笔记关联的文件
    return db.value?.file_refs.where('refid').equals(noteId.toString()).toArray().then(async (refs) => {
      if (!refs || refs.length === 0)
        return []
      const files = []
      for (const ref of refs) {
        const file = await db.value?.file.get(ref.hash)
        if (file)
          files.push(file)
      }
      return files
    })
  }

  async function deleteFileByNoteId(noteId: number) {
    // 删除文件引用关系
    await db.value?.file_refs.where('refid').equals(noteId.toString()).delete()

    // 检查是否有文件不再被任何笔记引用，如果是则删除文件
    const allRefs = await db.value?.file_refs.toArray()
    const referencedHashes = new Set(allRefs?.map(ref => ref.hash) || [])

    const allFiles = await db.value?.file.toArray()
    for (const file of allFiles || []) {
      if (!referencedHashes.has(file.hash)) {
        await db.value?.file.delete(file.hash)
      }
    }
  }

  // 使用hash作为主键删除文件
  function deleteFile(hash: string) {
    return db.value?.file.delete(hash)
  }

  function updateFile(file: TypedFile) {
    return db.value?.file.put(file)
  }

  function getLocalFiles() {
    return db.value?.file.where('id').equals(0).toArray()
  }

  return {
    addFile,
    getFile,
    getFileByHash,
    getFileByUrl,
    getFileByNoteId,
    deleteFile,
    deleteFileByNoteId,
    updateFile,
    getLocalFiles,
  }
}
