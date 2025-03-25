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

  function getFile(localId: string) {
    return db.value?.files.where('localId').equals(localId).first()
  }

  return {
    addFile,
    getFile,
  }
}
