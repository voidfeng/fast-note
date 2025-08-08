import type { TypedFile } from '@/types'
import { supabase } from '../api/supabaseClient'

// Storage bucket 名称
const BUCKET_NAME = 'note-private-files'

/**
 * 生成文件存储路径
 * 使用 hash 的前两位和3-4位作为目录，避免单个目录文件过多
 * @param userId 用户ID
 * @param hash 文件hash
 * @returns 存储路径
 */
export function generateStoragePath(userId: string, hash: string): string {
  // 确保 hash 至少有4个字符
  if (hash.length < 4) {
    throw new Error('文件 hash 长度不足')
  }

  // 使用 hash 的前两位作为一级目录，3-4位作为二级目录
  const dir1 = hash.substring(0, 2)
  const dir2 = hash.substring(2, 4)

  // 路径格式: userId/xx/xx/hash
  return `${userId}/${dir1}/${dir2}/${hash}`
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
    const path = generateStoragePath(userId, hash)

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

    // 获取文件URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path)

    return {
      success: true,
      url: urlData.publicUrl,
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
 * @returns 文件Blob或错误
 */
export async function downloadFileFromStorage(
  userId: string,
  hash: string,
): Promise<{ success: boolean, blob?: Blob, error?: string }> {
  try {
    const path = generateStoragePath(userId, hash)

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
 * @param hashes 文件hash数组
 * @returns 删除结果
 */
export async function deleteFilesFromStorage(
  userId: string,
  hashes: string[],
): Promise<{ success: boolean, error?: string }> {
  try {
    const paths = hashes.map(hash => generateStoragePath(userId, hash))

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
