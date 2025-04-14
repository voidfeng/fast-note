import type { Ref } from 'vue'
import Dexie from 'dexie'
import { ref } from 'vue'

// 定义数据库结构

export interface Note {
  isdeleted: 0 | 1
  version: number
  lastdotime: number
  id?: number
  uuid: string
  title: string
  ftitle: string
  newstime: number
  newstext: string
  type: 'folder' | 'note'
  puuid: string
  noteCount?: number
}

export interface TypedFile {
  localId?: string
  url?: string
  file?: File
  hash?: string
  id?: number
  ids?: number[]
  isdeleted?: 0 | 1
}

export interface FileRef {
  hash: string
  refid: string
  lastdotime: number
  isdeleted: 0 | 1
}

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
      note: '&uuid, title, newstime, type, puuid, newstext, lastdotime, version',
      file: '&hash, url, ids',
      file_refs: '[hash+refid], hash, refid',
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
