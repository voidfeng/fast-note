import type { TypedFile } from '@/types'
import { supabase } from '../api/supabaseClient'

// Storage bucket 名称
const BUCKET_NAME = 'note-private-files'

// MIME 类型到文件扩展名的映射
const mimeToExtension: Record<string, string> = {
  // 图片类型
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',

  // 文档类型
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',

  // 文本类型
  'text/plain': 'txt',
  'text/html': 'html',
  'text/css': 'css',
  'text/javascript': 'js',
  'application/json': 'json',
  'text/xml': 'xml',
  'text/csv': 'csv',

  // 音频类型
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',

  // 视频类型
  'video/mp4': 'mp4',
  'video/mpeg': 'mpeg',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/webm': 'webm',

  // 压缩文件
  'application/zip': 'zip',
  'application/x-rar-compressed': 'rar',
  'application/x-7z-compressed': '7z',
  'application/gzip': 'gz',
}

/**
 * 获取文件扩展名
 * @param mimeType MIME类型
 * @param fileName 文件名（备用方案）
 * @returns 扩展名（不包含点）
 */
function getFileExtension(mimeType: string, fileName?: string): string {
  // 首先尝试从 MIME 类型获取扩展名
  const extension = mimeToExtension[mimeType]
  if (extension) {
    return extension
  }

  // 如果 MIME 类型未找到，尝试从文件名获取扩展名
  if (fileName) {
    const lastDotIndex = fileName.lastIndexOf('.')
    if (lastDotIndex > 0) {
      return fileName.substring(lastDotIndex + 1).toLowerCase()
    }
  }

  // 默认返回 'bin'
  return 'bin'
}

/**
 * 生成文件存储路径
 * 路径格式: userId/YYYY-MM/hash.extension
 * @param userId 用户ID
 * @param hash 文件hash
 * @param mimeType 文件MIME类型
 * @param fileName 文件名（可选，用于扩展名备用方案）
 * @returns 存储路径
 */
export function generateStoragePath(userId: string, hash: string, mimeType: string, fileName?: string): string {
  // 获取当前日期的年月
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const dateDir = `${year}-${month}`

  // 获取文件扩展名
  const extension = getFileExtension(mimeType, fileName)

  // 路径格式: userId/YYYY-MM/hash.extension
  return `/${userId}/${dateDir}/${hash}.${extension}`
}

/**
 * 上传文件到 Supabase Storage
 * @param file 文件对象
 * @param userId 用户ID
 * @param hash 文件hash
 * @returns 上传结果
 */
export async function uploadFileToStorage(
  file: File,
  userId: string,
  hash: string,
): Promise<{ success: boolean, url?: string, error?: string }> {
  try {
    const path = generateStoragePath(userId, hash, file.type, file.name)

    // 检查文件是否已存在
    const { data: existingFile } = await supabase.storage
      .from(BUCKET_NAME)
      .list(path.substring(0, path.lastIndexOf('/')), {
        limit: 1,
        search: hash,
      })

    // 如果文件已存在，直接返回URL
    if (existingFile && existingFile.length > 0) {
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path)

      return {
        success: true,
        url: urlData.publicUrl,
      }
    }

    console.log('上传文件至Supabase Storage')
    // 上传文件
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file)

    if (error) {
      // 如果是文件已存在的错误，不算失败
      if (error.message.includes('already exists')) {
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(path)

        return {
          success: true,
          url: urlData.publicUrl,
        }
      }

      throw error
    }

    console.log('获取文件URL')

    // 获取文件URL（使用签名URL，因为这是非公共bucket）
    const { data: urlData, error: urlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, 60 * 60 * 24) // 24小时有效期

    if (urlError) {
      throw urlError
    }

    console.log('签名url', urlData)

    return {
      success: true,
      url: urlData.signedUrl,
    }
  }
  catch (error) {
    console.error('上传文件失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败',
    }
  }
}

/**
 * 批量上传文件
 * @param files 文件数组（包含file和hash）
 * @param userId 用户ID
 * @param onProgress 进度回调
 * @returns 上传结果映射
 */
export async function uploadFilesToStorage(
  files: TypedFile[],
  userId: string,
  onProgress?: (completed: number, total: number) => void,
): Promise<Map<string, { success: boolean, url?: string, error?: string }>> {
  const results = new Map<string, { success: boolean, url?: string, error?: string }>()
  let completed = 0

  // 并行上传所有文件
  const uploadPromises = files.map(async (fileData) => {
    if (!fileData.file) {
      results.set(fileData.hash, {
        success: false,
        error: '文件对象不存在',
      })
      return
    }

    const result = await uploadFileToStorage(fileData.file, userId, fileData.hash)
    results.set(fileData.hash, result)

    completed++
    onProgress?.(completed, files.length)
  })

  await Promise.all(uploadPromises)

  return results
}

/**
 * 下载文件从 Supabase Storage
 * @param userId 用户ID
 * @param hash 文件hash
 * @param mimeType 文件MIME类型
 * @param fileName 文件名（可选）
 * @returns 文件Blob或错误
 */
export async function downloadFileFromStorage(
  userId: string,
  hash: string,
  mimeType: string,
  fileName?: string,
): Promise<{ success: boolean, blob?: Blob, error?: string }> {
  try {
    const path = generateStoragePath(userId, hash, mimeType, fileName)

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(path)

    if (error) {
      throw error
    }

    return {
      success: true,
      blob: data,
    }
  }
  catch (error) {
    console.error('下载文件失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '下载失败',
    }
  }
}

/**
 * 删除文件从 Supabase Storage
 * @param userId 用户ID
 * @param fileInfo 文件信息数组（包含hash、mimeType、可选的fileName）
 * @returns 删除结果
 */
export async function deleteFilesFromStorage(
  userId: string,
  fileInfo: Array<{ hash: string, mimeType: string, fileName?: string }>,
): Promise<{ success: boolean, error?: string }> {
  try {
    const paths = fileInfo.map(info => generateStoragePath(userId, info.hash, info.mimeType, info.fileName))

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(paths)

    if (error) {
      throw error
    }

    return { success: true }
  }
  catch (error) {
    console.error('删除文件失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除失败',
    }
  }
}
