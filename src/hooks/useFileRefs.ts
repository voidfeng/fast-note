import type { FileRef } from '@/types'
import { useDexie } from '@/database'

let isInitialized = false
export function useFileRefs() {
  const { db } = useDexie()
  if (!isInitialized) {
    isInitialized = true
  }

  function addFileRef(data: FileRef) {
    return db.value?.note_files.add(data)
  }

  function updateFileRef(data: FileRef) {
    return db.value?.note_files.put(data)
  }

  // 根据refid获取全部文件引用
  function getFileRefsByRefid(refid: string) {
    return db.value?.note_files.where('refid').equals(refid).toArray()
  }

  // 根据hash获取全部引用位置
  function getFilesRefByHash(hash: string) {
    return db.value?.note_files.where('hash').equals(hash).toArray()
  }

  // 根据refid删除全部引用
  function deleteFilesRefByRefid(refid: string) {
    return db.value?.note_files.where('refid').equals(refid).delete()
  }

  // 根据 hash 和 refid 删除引用
  function deleteFilesRefByHashAndRefid(hash: string, refid: string) {
    return db.value?.note_files.where('[hash+refid]').equals([hash, refid]).delete()
  }

  // 根据 hash 和 refid 删除引用
  function getFileRefByHashAndRefid(hash: string, refid: string) {
    return db.value?.note_files.where('[hash+refid]').equals([hash, refid]).first()
  }

  // 根据hash获取引用数量
  function getRefCount(hash: string) {
    return db.value?.note_files.where('hash').equals(hash).count()
  }

  // 根据lastdotime获取全部引用
  function getFileRefsByLastdotime(lastdotime: string) {
    return db.value?.note_files.where('lastdotime').aboveOrEqual(lastdotime).toArray()
  }

  // 根据id删除文件引用
  function deleteFileRef(id: string) {
    return db.value?.note_files.delete(id)
  }

  return {
    addFileRef,
    updateFileRef,
    getFileRefsByRefid,
    getFilesRefByHash,
    deleteFilesRefByRefid,
    deleteFilesRefByHashAndRefid,
    getFileRefByHashAndRefid,
    getRefCount,
    getFileRefsByLastdotime,
    deleteFileRef,
  }
}
