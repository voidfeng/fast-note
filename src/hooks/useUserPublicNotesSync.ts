import { ref } from 'vue'
// import type { Note } from '@/types' // 暂时未使用，等待 PocketBase 实现时再启用
import { useUserPublicNotes } from '@/stores'
import { useUserCache } from './useUserCache'
// TODO: 如果需要，可以添加 PocketBase 公开笔记同步功能
// import { notesApi } from '@/extensions/pocketbase/api/client'

export function useUserPublicNotesSync(username: string) {
  const { publicNotes } = useUserPublicNotes(username)
  const { getUserInfo } = useUserCache()
  const syncing = ref(false)

  // 设置笔记数据的函数（暂时未使用，等待 PocketBase 实现）
  // function setPublicNotes(newNotes: Note[]) {
  //   // 直接更新 publicNotes ref
  //   publicNotes.value = newNotes
  // }

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
      }

      // TODO: 实现 PocketBase 公开笔记同步功能
      // 可以根据需要调用 PocketBase API 获取公开笔记
      console.log(`准备同步用户 ${userInfo?.username || username} 的公开笔记`)

      // 暂时返回空结果，等待实现 PocketBase 功能
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
