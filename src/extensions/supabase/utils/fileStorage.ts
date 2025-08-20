import type { TypedFile } from '@/types'
import { getFileExtension as getExtensionFromFilename, getMimeTypeByExtension } from '@/utils/mimeTypes'
import { supabase } from '../api/client'

// Storage bucket 名称
const BUCKET_NAME = 'note-private-files'

/**
 * 获取文件扩展名
 * @param mimeType MIME类型
 * @param fileName 文件名（备用方案）
 * @returns 扩展名（不包含点）
 */
function getFileExtension(mimeType: string, fileName?: string): string {
  // 首先尝试从 MIME 类型获取扩展名
  // 遍历常用扩展名找到对应的扩展名
  const commonExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf', 'txt', 'csv', 'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'zip', 'rar', 'tar', 'gz', '7z', 'json', 'xml', 'html', 'css', 'js', 'psd']

  for (const ext of commonExtensions) {
    if (getMimeTypeByExtension(ext) === mimeType) {
      return ext
    }
  }

  // 如果 MIME 类型未找到，尝试从文件名获取扩展名
  if (fileName) {
    const extension = getExtensionFromFilename(fileName)
    if (extension) {
      return extension
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
): Promise<{ success: boolean, path?: string, error?: string }> {
  try {
    const path = generateStoragePath(userId, hash, file.type, file.name)

    // 检查文件是否已存在
    const { data: existingFile } = await supabase.storage
      .from(BUCKET_NAME)
      .list(path.substring(0, path.lastIndexOf('/')), {
        limit: 1,
        search: hash,
      })

    // 如果文件已存在，直接返回path
    if (existingFile && existingFile.length > 0) {
      return {
        success: true,
        path,
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
        return {
          success: true,
          path,
        }
      }

      throw error
    }

    return {
      success: true,
      path,
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
): Promise<Map<string, { success: boolean, path?: string, error?: string }>> {
  const results = new Map<string, { success: boolean, path?: string, error?: string }>()
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
