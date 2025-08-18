import { supabase } from '../api/client'

/**
 * 从 Supabase 私有存储桶下载文件
 * @param path 文件路径
 * @param bucketName 存储桶名称，默认为 'note-private-files'
 * @returns 返回包含 blob URL 和文件类型的对象
 */
export async function downloadFileFromSupabase(
  path: string,
  bucketName: string = 'note-private-files',
): Promise<{ url: string, type: string }> {
  try {
    // 获取当前用户会话
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('获取用户会话失败:', sessionError)
      throw new Error('用户未登录')
    }

    if (!session?.access_token) {
      console.warn('用户未登录，无法访问私有存储桶')
      throw new Error('用户未登录')
    }

    // 使用 Supabase 客户端下载文件
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(path)

    if (error) {
      console.error('从 Supabase 下载文件失败:', error)
      throw error
    }

    if (!data) {
      throw new Error('下载的文件数据为空')
    }

    // 创建 blob URL
    const blobUrl = URL.createObjectURL(data)

    return {
      url: blobUrl,
      type: data.type || '',
    }
  }
  catch (error) {
    console.error('下载文件失败:', error)
    throw error
  }
}

/**
 * 创建文件的签名URL（用于访问其他用户的文件）
 * @param path 文件路径
 * @param bucketName 存储桶名称，默认为 'note-private-files'
 * @param expiresIn 过期时间（秒），默认1小时
 * @returns 返回包含签名URL和文件类型的对象
 */
export async function createSignedUrlForFile(
  path: string,
  bucketName: string = 'note-private-files',
  expiresIn: number = 3600,
): Promise<{ url: string, type: string }> {
  try {
    // 创建签名URL
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.error('创建签名URL失败:', error)
      throw error
    }

    if (!data?.signedUrl) {
      throw new Error('签名URL创建失败')
    }

    // 从路径推断文件类型
    const extension = path.split('.').pop()?.toLowerCase() || ''
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      txt: 'text/plain',
      json: 'application/json',
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
    }

    return {
      url: data.signedUrl,
      type: mimeTypes[extension] || 'application/octet-stream',
    }
  }
  catch (error) {
    console.error('创建签名URL失败:', error)
    throw error
  }
}

/**
 * 检查用户是否已登录
 */
export async function isUserAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session?.access_token
  }
  catch (error) {
    console.error('检查用户认证状态失败:', error)
    return false
  }
}
