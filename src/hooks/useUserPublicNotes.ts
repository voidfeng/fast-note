import type { Note } from '@/types'
import Dexie from 'dexie'
import { ref } from 'vue'

interface UserInfo {
  id: string
  username: string
  name?: string
}

interface UserPublicNotesDatabase extends Dexie {
  folders: Dexie.Table<Note & { noteCount: number }, string>
  metadata: Dexie.Table<{ key: string, value: string }, string>
  userInfo: Dexie.Table<UserInfo, string>
}

const dbCache = new Map<string, UserPublicNotesDatabase>()

export function useUserPublicNotes(username: string) {
  const db = ref<UserPublicNotesDatabase>()

  async function init() {
    // 检查缓存中是否已有该用户的数据库实例
    if (dbCache.has(username)) {
      db.value = dbCache.get(username)!
      return
    }

    // 创建以用户名为名称的数据库
    const dbName = `user_public_notes_${username}`
    db.value = new Dexie(dbName) as UserPublicNotesDatabase

    // 定义表结构
    db.value.version(1).stores({
      folders: '&uuid, title, newstime, lastdotime, type, puuid, noteCount',
      metadata: '&key, value',
      userInfo: '&id, username, name',
    })

    // 等待数据库打开
    await db.value.open()

    // 缓存数据库实例
    dbCache.set(username, db.value)
  }

  // 获取本地存储的文件夹数据
  async function getLocalFolders(): Promise<(Note & { noteCount: number })[]> {
    if (!db.value)
      await init()
    return await db.value!.folders.toArray()
  }

  // 保存文件夹数据到本地
  async function saveFolders(folders: (Note & { noteCount: number })[]) {
    if (!db.value)
      await init()

    // 清空现有数据并保存新数据
    await db.value!.folders.clear()
    if (folders.length > 0) {
      await db.value!.folders.bulkAdd(folders)
    }
  }

  // 获取最后更新时间
  async function getLastUpdateTime(): Promise<string | null> {
    if (!db.value)
      await init()

    const metadata = await db.value!.metadata.get('lastUpdateTime')
    return metadata?.value || null
  }

  // 保存最后更新时间
  async function saveLastUpdateTime(time: string) {
    if (!db.value)
      await init()

    await db.value!.metadata.put({
      key: 'lastUpdateTime',
      value: time,
    })
  }

  // 检查是否需要更新数据（比较最后更新时间）
  async function shouldUpdate(): Promise<boolean> {
    const lastUpdateTime = await getLastUpdateTime()
    if (!lastUpdateTime)
      return true

    // 如果距离上次更新超过5分钟，则需要更新
    const lastUpdate = new Date(lastUpdateTime)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60)

    return diffMinutes > 5
  }

  // 保存用户信息
  async function saveUserInfo(userInfo: UserInfo) {
    if (!db.value)
      await init()

    await db.value!.userInfo.put(userInfo)
  }

  // 获取用户信息
  async function getUserInfo(): Promise<UserInfo | null> {
    if (!db.value)
      await init()

    try {
      const users = await db.value!.userInfo.toArray()
      return users.length > 0 ? users[0] : null
    }
    catch (error) {
      console.warn('获取用户信息失败:', error)
      return null
    }
  }

  // 清空用户数据
  async function clearUserData() {
    if (!db.value)
      await init()

    await db.value!.folders.clear()
    await db.value!.metadata.clear()
    await db.value!.userInfo.clear()
  }

  return {
    db,
    init,
    getLocalFolders,
    saveFolders,
    getLastUpdateTime,
    saveLastUpdateTime,
    shouldUpdate,
    saveUserInfo,
    getUserInfo,
    clearUserData,
  }
}
