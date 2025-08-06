import type { Ref } from 'vue'
import type { FileRef, Note, NoteDetail, TypedFile } from '@/types'
import Dexie from 'dexie'
import { ref } from 'vue'

// 重新导出类型，以便其他模块可以从这里导入
export type { FileRef, Note, NoteDetail, TypedFile }

interface NoteDatabase extends Dexie {
  note: Dexie.Table<Note, string>
  file: Dexie.Table<TypedFile, string>
  file_refs: Dexie.Table<FileRef, string>
}

const db = ref<NoteDatabase>()
const onNoteUpdateArr: (() => void)[] = []

export function useDexie() {
  const privateNoteUpdateArr: (() => void)[] = []

  async function init() {
    db.value = new Dexie('note') as NoteDatabase
    (window as any).db = db.value
    // 定义表结构和索引
    db.value.version(1).stores({
      note: '&uuid, [type+puuid+isdeleted], title, newstime, type, puuid, newstext, lastdotime, version, isdeleted',
      file: '&hash, id, url, lastdotime',
      file_refs: '[hash+refid], hash, refid, lastdotime',
    })
  }

  function onNoteUpdate(fn: () => void) {
    onNoteUpdateArr.push(fn)
    privateNoteUpdateArr.push(fn)
  }

  return {
    db: db as Ref<NoteDatabase>,
    init,
    onNoteUpdate,
  }
}
