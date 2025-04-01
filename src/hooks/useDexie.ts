import Dexie from 'dexie'
import { Ref, ref } from 'vue'

// 定义数据库结构

export interface Note {
  version: number
  lastdotime: number
  id?: number
  uuid: string
  title: string
  newstime: number
  newstext: string
  type: 'folder' | 'note'
  puuid: string
  noteCount?: number
}

export interface TypedFile {
  ids: number[]
  localId?: string
  url?: string
  file?: File
  id?: number
  hash?: string
}

interface NoteDatabase extends Dexie {
  notes: Dexie.Table<Note, string>
  files: Dexie.Table<TypedFile, number>
}

const db = ref<NoteDatabase>()
const onNoteUpdateArr: (() => void)[] = []

export function useDexie() {
  const privateNoteUpdateArr: (() => void)[] = []

  async function init() {
    db.value = new Dexie('note') as NoteDatabase

    // 定义表结构和索引
    db.value.version(1).stores({
      notes: '&uuid, title, newstime, type, puuid, newstext, lastdotime, version',
      files: '++id, url, ids, hash',
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
