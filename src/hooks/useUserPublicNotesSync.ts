import { ref } from 'vue'
import { notesApi } from '@/extensions/pocketbase/api/client'
// import type { Note } from '@/types' // 暂时未使用，等待 PocketBase 实现时再启用
import { useUserPublicNotes } from '@/stores'
import { useUserCache } from './useUserCache'

export function useUserPublicNotesSync(username: string) {
  const { publicNotes } = useUserPublicNotes(username)
  const { getPublicUserInfo } = useUserCache()
  const syncing = ref(false)

  // 同步指定用户的公开笔记
  async function syncUserPublicNotes() {
    if (!username)
      return

    syncing.value = true

    try {
      // 先根据用户名获取用户信息
      const userInfo = await getPublicUserInfo(username)
      if (userInfo) {
        // 可以根据需要调用 PocketBase API 获取公开笔记
        const notes = await notesApi.getPublicNotes(userInfo.id)

        publicNotes.value = notes
        return {
          synced: notes.length,
          notes,
        }
      }
      return {
        synced: 0,
        notes: [],
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
    publicNotes,
    syncing,
    syncUserPublicNotes,
  }
}
