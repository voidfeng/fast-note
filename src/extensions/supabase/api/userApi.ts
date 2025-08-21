import type { Note } from '@/types'
import { supabase } from './client'
import { getUserPublicFolder, getUserPublicFolderContents, getUserPublicFolders } from './noteSharing'

/**
 * 通过用户名获取用户信息
 */
export async function getUserByUsername(username: string): Promise<{ id: string, username: string } | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .single()

    if (error || !data) {
      console.error('获取用户信息失败:', error)
      return null
    }

    return data
  }
  catch (error) {
    console.error('获取用户信息异常:', error)
    return null
  }
}

// 用户信息缓存
const userCache = new Map<string, { id: string, username: string }>()

/**
 * 通过用户名获取用户的公开文件夹（优化版，接受用户ID参数避免重复查询）
 */
export async function getUserPublicFoldersByUsername(username: string, userId?: string): Promise<Note[]> {
  try {
    let user: { id: string, username: string } | null = null

    if (userId) {
      // 如果已经有用户ID，直接使用
      user = { id: userId, username }
    }
    else {
      // 检查缓存
      if (userCache.has(username)) {
        user = userCache.get(username)!
      }
      else {
        // 从数据库获取并缓存
        user = await getUserByUsername(username)
        if (user) {
          userCache.set(username, user)
        }
      }
    }

    if (!user) {
      return []
    }

    return await getUserPublicFolders(user.id)
  }
  catch (error) {
    console.error('通过用户名获取用户公开文件夹异常:', error)
    return []
  }
}

/**
 * 通过用户名获取用户公开文件夹的内容（优化版，接受用户ID参数避免重复查询）
 */
export async function getUserPublicFolderContentsByUsername(username: string, folderId: string, userId?: string): Promise<Note[]> {
  try {
    let user: { id: string, username: string } | null = null

    if (userId) {
      // 如果已经有用户ID，直接使用
      user = { id: userId, username }
    }
    else {
      // 检查缓存
      if (userCache.has(username)) {
        user = userCache.get(username)!
      }
      else {
        // 从数据库获取并缓存
        user = await getUserByUsername(username)
        if (user) {
          userCache.set(username, user)
        }
      }
    }

    if (!user) {
      return []
    }

    return await getUserPublicFolderContents(user.id, folderId)
  }
  catch (error) {
    console.error('通过用户名获取用户公开文件夹内容异常:', error)
    return []
  }
}

/**
 * 通过用户名获取用户公开文件夹信息（优化版，接受用户ID参数避免重复查询）
 */
export async function getUserPublicFolderByUsername(username: string, folderId: string, userId?: string): Promise<Note | null> {
  try {
    let user: { id: string, username: string } | null = null

    if (userId) {
      // 如果已经有用户ID，直接使用
      user = { id: userId, username }
    }
    else {
      // 检查缓存
      if (userCache.has(username)) {
        user = userCache.get(username)!
      }
      else {
        // 从数据库获取并缓存
        user = await getUserByUsername(username)
        if (user) {
          userCache.set(username, user)
        }
      }
    }

    if (!user) {
      return null
    }

    return await getUserPublicFolder(user.id, folderId)
  }
  catch (error) {
    console.error('通过用户名获取用户公开文件夹信息异常:', error)
    return null
  }
}

/**
 * 通过用户名获取公开笔记详情（优化版，接受用户ID参数避免重复查询）
 */
export async function getPublicNoteByUsername(username: string, noteId: string, userId?: string): Promise<Note | null> {
  try {
    let user: { id: string, username: string } | null = null

    if (userId) {
      // 如果已经有用户ID，直接使用
      user = { id: userId, username }
    }
    else {
      // 检查缓存
      if (userCache.has(username)) {
        user = userCache.get(username)!
      }
      else {
        // 从数据库获取并缓存
        user = await getUserByUsername(username)
        if (user) {
          userCache.set(username, user)
        }
      }
    }

    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from('note')
      .select('*')
      .eq('uuid', noteId)
      .eq('user_id', user.id)
      .eq('is_public', true)
      .eq('isdeleted', 0)
      .single()

    if (error || !data) {
      console.error('获取公开笔记失败:', error)
      return null
    }

    return data as Note
  }
  catch (error) {
    console.error('获取公开笔记异常:', error)
    return null
  }
}

/**
 * 清除用户缓存
 */
export function clearUserCache() {
  userCache.clear()
}
