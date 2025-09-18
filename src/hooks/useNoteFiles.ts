import type { NoteFile } from '@/database/types'
import { useDexie } from '@/database'
import { getTime } from '@/utils/date'

/**
 * 操作 note_files 表的组合式函数
 */
export function useNoteFiles() {
  const { db } = useDexie()

  /**
   * 添加文件到存储表
   */
  async function addNoteFile(file: File, hash: string): Promise<void> {
    const noteFile: NoteFile = {
      hash,
      file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      created: getTime(),
      updated: getTime(),
    }

    await db.value?.note_files.put(noteFile)
  }

  /**
   * 根据hash获取文件
   */
  async function getNoteFileByHash(hash: string): Promise<NoteFile | undefined> {
    return await db.value?.note_files.get(hash)
  }

  /**
   * 根据hash批量获取文件
   */
  async function getNoteFilesByHashes(hashes: string[]): Promise<NoteFile[]> {
    if (!db.value || hashes.length === 0) {
      return []
    }

    const files = await Promise.all(
      hashes.map(hash => db.value!.note_files.get(hash)),
    )

    return files.filter(Boolean) as NoteFile[]
  }

  /**
   * 检查文件是否存在
   */
  async function noteFileExists(hash: string): Promise<boolean> {
    const file = await db.value?.note_files.get(hash)
    return !!file
  }

  /**
   * 删除文件
   */
  async function deleteNoteFile(hash: string): Promise<void> {
    await db.value?.note_files.delete(hash)
  }

  /**
   * 批量删除文件
   */
  async function deleteNoteFiles(hashes: string[]): Promise<void> {
    if (!db.value || hashes.length === 0) {
      return
    }

    await Promise.all(
      hashes.map(hash => db.value!.note_files.delete(hash)),
    )
  }

  /**
   * 获取所有文件
   */
  async function getAllNoteFiles(): Promise<NoteFile[]> {
    return await db.value?.note_files.toArray() || []
  }

  /**
   * 清理未引用的文件（可选的清理功能）
   */
  async function cleanupUnreferencedFiles(referencedHashes: string[]): Promise<void> {
    if (!db.value)
      return

    const allFiles = await db.value.note_files.toArray()
    const referencedHashSet = new Set(referencedHashes)

    const unreferencedFiles = allFiles.filter(file => !referencedHashSet.has(file.hash))

    if (unreferencedFiles.length > 0) {
      await Promise.all(
        unreferencedFiles.map(file => db.value!.note_files.delete(file.hash)),
      )
    }
  }

  /**
   * 更新文件信息
   */
  async function updateNoteFile(hash: string, updates: Partial<Omit<NoteFile, 'hash'>>): Promise<void> {
    const existingFile = await db.value?.note_files.get(hash)
    if (!existingFile) {
      throw new Error(`文件 ${hash} 不存在`)
    }

    const updatedFile: NoteFile = {
      ...existingFile,
      ...updates,
      updated: getTime(),
    }

    await db.value?.note_files.put(updatedFile)
  }

  return {
    addNoteFile,
    getNoteFileByHash,
    getNoteFilesByHashes,
    noteFileExists,
    deleteNoteFile,
    deleteNoteFiles,
    getAllNoteFiles,
    cleanupUnreferencedFiles,
    updateNoteFile,
  }
}
