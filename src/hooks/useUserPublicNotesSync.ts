import type { Note } from '@/types'
import { ref } from 'vue'
import { getSupabasePublicNotesByUserId } from '@/extensions/supabase/api/api'
import { useUserCache } from './useUserCache'
import { useUserPublicNotes } from './useUserPublicNotes'

export function useUserPublicNotesSync(username: string) {
  const { notes } = useUserPublicNotes(username)
  const { getUserInfo } = useUserCache()
  const syncing = ref(false)

  // 设置笔记数据的函数
  function setNotes(newNotes: Note[]) {
    // 直接更新 notes ref
    notes.value = newNotes
  }

  // 同步指定用户的公开笔记
  async function syncUserPublicNotes() {
    if (!username)
      return

    syncing.value = true

    try {
      // 先根据用户名获取用户信息
      const userInfo = await getUserInfo(username)
      if (!userInfo) {
        console.warn('未找到用户信息:', username)
        return
      }

      // 从 supabase 获取指定用户的公开笔记
      const cloudNotes = await getSupabasePublicNotesByUserId(userInfo.id)

      if (!cloudNotes?.d) {
        console.warn('获取用户公开笔记失败', cloudNotes)
        return
      }

      // newstext 转义
      const processedNotes = (cloudNotes.d as Note[]).map(note => ({
        ...note,
        newstext: note.newstext.replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      }))

      // 更新本地存储的公开笔记
      setNotes(processedNotes)

      // 只更新本地存储的公开笔记，不修改本地数据库

      console.log(`成功同步 ${processedNotes.length} 条公开笔记`)

      return {
        synced: processedNotes.length,
        notes: processedNotes,
      }
    }
    catch (error) {
      console.error('同步用户公开笔记失败:', error)
      throw error
    }
    finally {
      syncing.value = false
    }
  }

  return {
    notes,
    syncing,
    syncUserPublicNotes,
  }
}
