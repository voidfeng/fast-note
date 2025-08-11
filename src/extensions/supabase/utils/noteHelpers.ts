import type { Note } from '@/types'

// 按 lastdotime 排序笔记
export function sortNotesByHierarchy(notes: Note[]): Note[] {
  return notes.sort((a, b) => {
    const timeA = new Date(a.lastdotime).getTime()
    const timeB = new Date(b.lastdotime).getTime()
    return timeA - timeB // 升序排列，最新的在后面
  })
}
