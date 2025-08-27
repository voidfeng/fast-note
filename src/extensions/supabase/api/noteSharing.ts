import type { Note } from '@/types'
import { supabase } from './client'

/**
 * 获取公开笔记详情
 */
export async function getPublicNote(noteId: string): Promise<Note | null> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('uuid', noteId)
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
 * 获取指定用户的所有公开笔记
 */
export async function getUserPublicNotes(userId: string): Promise<{
  success: boolean
  notes?: Note[]
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_public', true)
      .eq('isdeleted', 0)
      .order('lastdotime', { ascending: false })

    if (error) {
      console.error('获取用户公开笔记失败:', error)
      return {
        success: false,
        error: '获取笔记失败',
      }
    }

    return {
      success: true,
      notes: data || [],
    }
  }
  catch (error) {
    console.error('获取用户公开笔记异常:', error)
    return {
      success: false,
      error: '网络错误',
    }
  }
}

/**
 * 获取用户的公开文件夹
 */
export async function getUserPublicFolders(userId: string): Promise<Note[]> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'folder')
      .eq('isdeleted', 0)
      .order('title', { ascending: true })

    if (error) {
      console.error('获取用户公开文件夹失败:', error)
      return []
    }

    return (data as Note[]) || []
  }
  catch (error) {
    console.error('获取用户公开文件夹异常:', error)
    return []
  }
}

/**
 * 设置笔记分享状态
 */
export async function shareNote(request: {
  noteId: string
  isPublic: boolean
}): Promise<{
  success: boolean
  shareUrl?: string
  error?: string
}> {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    if (!userId) {
      return {
        success: false,
        error: '用户未登录',
      }
    }

    const { data, error } = await supabase
      .from('notes')
      .update({ is_public: request.isPublic })
      .eq('uuid', request.noteId)
      .eq('user_id', userId)
      .select('uuid')
      .single()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    // 获取用户的 username 来生成分享链接
    let shareUrl: string | undefined
    if (request.isPublic) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single()

      if (profileData?.username) {
        shareUrl = `${window.location.origin}/${profileData.username}/n/${request.noteId}`
      }
    }

    return {
      success: true,
      shareUrl,
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '分享设置失败',
    }
  }
}

/**
 * 获取用户公开文件夹的内容
 */
export async function getUserPublicFolderContents(userId: string, folderId: string): Promise<Note[]> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('puuid', folderId)
      .eq('isdeleted', 0)
      .order('type', { ascending: false }) // 文件夹在前
      .order('lastdotime', { ascending: false })

    if (error) {
      console.error('获取用户公开文件夹内容失败:', error)
      return []
    }

    // 过滤结果：文件夹不需要检查 is_public，但笔记需要检查
    const filteredData = (data as Note[]).filter((item) => {
      if (item.type === 'folder') {
        return true // 文件夹不需要检查 is_public
      }
      else {
        return item.is_public === true // 笔记需要检查 is_public
      }
    })

    return filteredData
  }
  catch (error) {
    console.error('获取用户公开文件夹内容异常:', error)
    return []
  }
}

/**
 * 获取用户公开文件夹信息
 */
export async function getUserPublicFolder(userId: string, folderId: string): Promise<Note | null> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('uuid', folderId)
      .eq('type', 'folder')
      .eq('isdeleted', 0)
      .single()

    if (error || !data) {
      console.error('获取用户公开文件夹信息失败:', error)
      return null
    }

    return data as Note
  }
  catch (error) {
    console.error('获取用户公开文件夹信息异常:', error)
    return null
  }
}

/**
 * 复制分享链接到剪贴板
 */
export async function copyShareLink(noteId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    if (userId) {
      // 获取用户的 username 来生成分享链接
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single()

      if (profileData?.username) {
        const shareUrl = `${window.location.origin}/${profileData.username}/n/${noteId}`
        await navigator.clipboard.writeText(shareUrl)
        return true
      }
    }
    return false
  }
  catch (error) {
    console.error('复制分享链接失败:', error)
    return false
  }
}
