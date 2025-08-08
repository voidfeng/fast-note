import type { Note, NoteDetail } from '@/types'
import { nanoid } from 'nanoid'
import { APP_CONFIG, DB_CONFIG, DELETE_STATUS, NOTE_TYPES } from '@/constants'
import { useDexie } from '@/hooks/useDexie'
import { getTime } from '@/utils/date'

/**
 * 笔记服务层 - 统一管理所有笔记相关的数据操作
 */
export class NoteService {
  private db: any

  constructor() {
    const { db } = useDexie()
    this.db = db
  }

  /**
   * 获取笔记
   */
  async getNote(uuid: string): Promise<Note | undefined> {
    if (uuid === 'allnotes') {
      return {
        title: APP_CONFIG.DEFAULT_FOLDER_NAME,
        type: NOTE_TYPES.FOLDER as 'folder',
        puuid: null,
        uuid: 'allnotes',
      } as Note
    }
    return this.db.value.note.where('uuid').equals(uuid).first()
  }

  /**
   * 创建笔记
   */
  async createNote(data: Partial<Note>): Promise<string> {
    const time = getTime()
    const note: Note = {
      uuid: nanoid(12),
      title: data.title || '无标题',
      smalltext: data.smalltext || '',
      newstime: time, // newstime 也使用 ISO 8601 格式
      newstext: data.newstext || '',
      type: (data.type || NOTE_TYPES.NOTE) as 'note' | 'folder',
      puuid: data.puuid || null,
      lastdotime: time,
      version: 1,
      isdeleted: DELETE_STATUS.ACTIVE,
      ...data,
      // 确保必需属性不被覆盖为 undefined
      islocked: data.islocked ?? 0,
    }

    await this.db.value.note.add(note)
    return note.uuid
  }

  /**
   * 更新笔记
   */
  async updateNote(uuid: string, updates: Partial<Note>): Promise<void> {
    const existingNote = await this.getNote(uuid)
    if (!existingNote) {
      throw new Error(`笔记不存在: ${uuid}`)
    }

    const updatedNote = {
      ...existingNote,
      ...updates,
      lastdotime: getTime(),
      version: (existingNote.version || 1) + 1,
    }

    await this.db.value.note.put(updatedNote, uuid)
  }

  /**
   * 删除笔记（软删除）
   */
  async deleteNote(uuid: string): Promise<void> {
    await this.updateNote(uuid, {
      isdeleted: DELETE_STATUS.DELETED,
      lastdotime: getTime(),
    })
  }

  /**
   * 永久删除笔记
   */
  async permanentDeleteNote(uuid: string): Promise<void> {
    await this.db.value.note.where('uuid').equals(uuid).delete()
  }

  /**
   * 获取文件夹下的笔记
   */
  async getNotesByFolder(puuid: string): Promise<Note[]> {
    if (puuid === 'allnotes') {
      return this.db.value.note
        .where('type')
        .equals(NOTE_TYPES.NOTE)
        .and((item: Note) => item.isdeleted !== DELETE_STATUS.DELETED)
        .toArray()
    }

    return this.db.value.note
      .where('puuid')
      .equals(puuid)
      .and((item: Note) => item.isdeleted !== DELETE_STATUS.DELETED)
      .toArray()
  }

  /**
   * 搜索笔记
   */
  async searchNotes(keyword: string): Promise<Note[]> {
    return this.db.value.note
      .where('type')
      .equals(NOTE_TYPES.NOTE)
      .and((item: Note) => {
        return item.isdeleted !== DELETE_STATUS.DELETED
          && (item.title.includes(keyword)
            || item.newstext.includes(keyword)
            || item.smalltext.includes(keyword))
      })
      .toArray()
  }

  /**
   * 获取已删除的笔记
   */
  async getDeletedNotes(): Promise<Note[]> {
    const retentionDays = DB_CONFIG.DELETED_RETENTION_DAYS * 24 * 60 * 60 * 1000
    const cutoffTime = new Date(Date.now() - retentionDays).toISOString()
    return this.db.value.note
      .where('isdeleted')
      .equals(DELETE_STATUS.DELETED)
      .and((item: Note) => item.lastdotime >= cutoffTime)
      .toArray()
  }

  /**
   * 恢复已删除的笔记
   */
  async restoreNote(uuid: string): Promise<void> {
    await this.updateNote(uuid, {
      isdeleted: DELETE_STATUS.ACTIVE,
      lastdotime: getTime(),
    })
  }
}

// 导出单例实例
export const noteService = new NoteService()
