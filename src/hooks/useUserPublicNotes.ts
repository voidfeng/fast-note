import type { UserInfo } from './useDexie'
import type { Note } from '@/types'
import { useDexie } from './useDexie'

export function useUserPublicNotes(username: string) {
  const { db, init: initDexie } = useDexie()

  async function init() {
    await initDexie()
    // 动态创建用户专用的公开笔记表
    await createUserPublicNotesTable()
  }

  // 动态创建用户专用的公开笔记表
  async function createUserPublicNotesTable() {
    if (!db.value)
      return

    const tableName = `public_notes_${username}`

    // 检查表是否已存在
    if (db.value.tables.some(table => table.name === tableName)) {
      return
    }

    try {
      // 获取当前数据库版本
      const currentVersion = db.value.verno
      const newVersion = currentVersion + 1

      // 获取当前所有表的定义
      const currentStores: { [key: string]: string } = {
        note: '&uuid, [type+puuid+isdeleted], title, newstime, type, puuid, newstext, lastdotime, version, isdeleted',
        file: '&hash, id, url, lastdotime',
        file_refs: '[hash+refid], hash, refid, lastdotime',
        userInfo: '&id, username, name',
        metadata: '&key, value',
      }

      // 添加新的用户公开笔记表
      currentStores[tableName] = '&uuid, [type+puuid+isdeleted], title, newstime, type, puuid, newstext, lastdotime, version, isdeleted, noteCount'

      // 关闭当前数据库连接
      db.value.close()

      // 重新初始化数据库并添加新版本
      await initDexie()
      if (db.value) {
        db.value.version(newVersion).stores(currentStores)
        await db.value.open()
      }
    }
    catch (error) {
      console.warn(`创建用户表 ${tableName} 时出现错误:`, error)
    }
  }

  // 获取本地存储的文件夹数据
  async function getLocalFolders(): Promise<(Note & { noteCount: number })[]> {
    if (!db.value)
      await init()

    const tableName = `public_notes_${username}`
    const table = db.value!.table(tableName)
    return await table.toArray()
  }

  // 保存文件夹数据到本地
  async function saveFolders(folders: (Note & { noteCount: number })[]) {
    if (!db.value)
      await init()

    const tableName = `public_notes_${username}`
    const table = db.value!.table(tableName)

    // 清空现有数据并保存新数据
    await table.clear()

    if (folders.length > 0) {
      await table.bulkAdd(folders)
    }
  }

  // 获取最后更新时间
  async function getLastUpdateTime(): Promise<string | null> {
    if (!db.value)
      await init()

    const metadataKey = `lastUpdateTime_${username}`
    const metadata = await db.value!.metadata.get(metadataKey)
    return metadata?.value || null
  }

  // 保存最后更新时间
  async function saveLastUpdateTime(time: string) {
    if (!db.value)
      await init()

    const metadataKey = `lastUpdateTime_${username}`
    await db.value!.metadata.put({
      key: metadataKey,
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

    // 确保用户信息包含用户名
    const userInfoWithUsername = {
      ...userInfo,
      username,
    }

    await db.value!.userInfo.put(userInfoWithUsername)
  }

  // 获取用户信息
  async function getUserInfo(): Promise<UserInfo | null> {
    if (!db.value)
      await init()

    try {
      const user = await db.value!.userInfo.where({ username }).first()
      return user || null
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

    // 清空用户专用的公开笔记表
    const tableName = `public_notes_${username}`
    const table = db.value!.table(tableName)
    await table.clear()

    // 删除用户相关的元数据和用户信息
    await db.value!.metadata.where({ key: `lastUpdateTime_${username}` }).delete()
    await db.value!.userInfo.where({ username }).delete()
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
