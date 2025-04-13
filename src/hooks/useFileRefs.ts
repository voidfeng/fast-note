import type { FileRef } from './useDexie'
import { useDexie } from './useDexie'

let isInitialized = false
export function useFileRefs() {
  const { db } = useDexie()
  if (!isInitialized) {
    isInitialized = true
  }

  function addFileRef(data: FileRef) {
    return db.value?.file_refs.add(data)
  }

  // 根据refid获取全部文件引用
  function getFileRefsByRefid(refid: string) {
    return db.value?.file_refs.where('refid').equals(refid).toArray()
  }

  // 根据hash获取全部引用位置
  function getFilesRefByHash(hash: string) {
    return db.value?.file_refs.where('hash').equals(hash).toArray()
  }

  // 根据refid删除全部引用
  function deleteFilesRefByRefid(refid: string) {
    return db.value?.file_refs.where('refid').equals(refid).delete()
  }

  // 根据 hash 和 refid 删除引用
  function deleteFilesRefByHashAndRefid(hash: string, refid: string) {
    return db.value?.file_refs.where('[hash+refid]').equals([hash, refid]).delete()
  }

  return {
    addFileRef,
    getFileRefsByRefid,
    getFilesRefByHash,
    deleteFilesRefByRefid,
    deleteFilesRefByHashAndRefid,
  }
}
