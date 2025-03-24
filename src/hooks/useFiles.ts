import { TypedFile, useDexie } from "./useDexie"

let isInitialized = false
export function useFiles() {
  const { db, init } = useDexie()
  if (!isInitialized) {
    init()
    isInitialized = true
  }

  function addFile(data: TypedFile) {
    db.value?.files.add(data)
  }

  function getFile(localId: string) {
    return db.value?.files.where('localId').equals(localId).first()
  }

  return {
    addFile,
    getFile,
  }
}
