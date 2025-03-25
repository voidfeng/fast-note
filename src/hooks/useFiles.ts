import { TypedFile, useDexie } from "./useDexie"

let isInitialized = false
export function useFiles() {
  const { db} = useDexie()
  if (!isInitialized) {
    isInitialized = true
  }

  function addFile(data: TypedFile) {
    return db.value?.files.add(data)
  }

  function getFile(id: number) {
    return db.value?.files.where('id').equals(id).first()
  }

  return {
    addFile,
    getFile,
  }
}
