import type { FileRef, Note, TypedFile } from '@/types'
import { supabase } from '../api/client'
import { uploadFilesToStorage } from '../utils/fileStorage'
import { useAuth } from './useAuth'

/**
 * 数据操作 Hook
 * 提供笔记、文件、文件引用的 CRUD 操作
 */
export function useData() {
  const { currentUser } = useAuth()
  // 获取用户的笔记数据 - 支持增量同步
  async function getUserNotes(lastSyncTime?: number): Promise<Note[]> {
    try {
      let query = supabase
        .from('notes')
        .select('*')
        .eq('user_id', currentUser.value?.id)
        .order('lastdotime', { ascending: false })

      // 如果提供了时间戳，只获取该时间之后的数据
      if (lastSyncTime && lastSyncTime > 0) {
        const syncDate = new Date(lastSyncTime).toISOString()
        query = query.gte('lastdotime', syncDate)
      }
      else {
        // 全量同步时限制数量
        query = query.limit(1000)
      }

      const { data, error } = await query

      if (error) {
        console.error('获取笔记数据失败:', error)
        return []
      }

      return data || []
    }
    catch (error) {
      console.error('获取笔记数据异常:', error)
      return []
    }
  }

  // 获取用户的文件数据 - 支持增量同步
  async function getUserFiles(lastSyncTime?: number): Promise<TypedFile[]> {
    try {
      let query = supabase
        .from('files')
        .select('*')
        .order('lastdotime', { ascending: false })

      // 如果提供了时间戳，只获取该时间之后的数据
      if (lastSyncTime && lastSyncTime > 0) {
        const syncDate = new Date(lastSyncTime).toISOString()
        query = query.gte('lastdotime', syncDate)
      }
      else {
        // 全量同步时限制数量
        query = query.limit(1000)
      }

      const { data, error } = await query

      if (error) {
        console.error('获取文件数据失败:', error)
        return []
      }

      return data || []
    }
    catch (error) {
      console.error('获取文件数据异常:', error)
      return []
    }
  }

  // 获取用户的文件引用数据 - 支持增量同步
  async function getUserFileRefs(lastSyncTime?: number): Promise<FileRef[]> {
    try {
      let query = supabase
        .from('note_files')
        .select('*')
        .order('lastdotime', { ascending: false })

      // 如果提供了时间戳，只获取该时间之后的数据
      if (lastSyncTime && lastSyncTime > 0) {
        const syncDate = new Date(lastSyncTime).toISOString()
        query = query.gte('lastdotime', syncDate)
      }
      else {
        // 全量同步时限制数量
        query = query.limit(1000)
      }

      const { data, error } = await query

      if (error) {
        console.error('获取文件引用数据失败:', error)
        return []
      }

      return data || []
    }
    catch (error) {
      console.error('获取文件引用数据异常:', error)
      return []
    }
  }

  // 获取笔记统计信息
  async function getNoteStats() {
    try {
      const { count, error } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error('获取笔记统计失败:', error)
        return 0
      }

      return count || 0
    }
    catch (error) {
      console.error('获取笔记统计异常:', error)
      return 0
    }
  }

  // 获取文件统计信息
  async function getFileStats() {
    try {
      const { count, error } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error('获取文件统计失败:', error)
        return 0
      }

      return count || 0
    }
    catch (error) {
      console.error('获取文件统计异常:', error)
      return 0
    }
  }

  // 获取文件引用统计信息
  async function getFileRefStats() {
    try {
      const { count, error } = await supabase
        .from('note_files')
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error('获取文件引用统计失败:', error)
        return 0
      }

      return count || 0
    }
    catch (error) {
      console.error('获取文件引用统计异常:', error)
      return 0
    }
  }

  // 批量插入或更新笔记数据 - 按顺序逐个插入以避免外键约束问题
  async function upsertNotes(notes: any[]): Promise<boolean> {
    try {
      let successCount = 0

      // 逐个插入笔记，确保顺序
      for (const note of notes) {
        const { error } = await supabase
          .from('notes')
          .upsert([note], { onConflict: 'uuid' })

        if (error) {
          console.error(`插入笔记 ${note.uuid} 失败:`, error)
          // 继续处理其他笔记，不中断整个流程
        }
        else {
          successCount++
        }
      }

      // 成功更新笔记到云端
      return successCount > 0
    }
    catch (error) {
      console.error('批量更新笔记异常:', error)
      return false
    }
  }

  // 批量插入或更新文件数据（包含文件上传）
  async function upsertFiles(files: any[]): Promise<boolean> {
    try {
      // 检查用户是否已登录
      if (!currentUser.value) {
        console.error('用户未登录，无法更新文件')
        return false
      }

      // 分离需要上传的文件和只需要更新元数据的文件
      const filesToUpload = files.filter(f => f.file && f.file instanceof File)
      const metadataOnly = files.filter(f => !f.file || !(f.file instanceof File))

      // 并行执行文件上传和元数据更新
      const uploadPromise = filesToUpload.length > 0
        ? uploadFilesToStorage(filesToUpload, currentUser.value.id)
        : Promise.resolve(new Map())

      // 准备所有文件的元数据（包括已上传的和仅元数据的）
      // 为仅元数据的文件添加 user_id
      const allMetadata = metadataOnly.map(file => ({
        ...file,
        user_id: currentUser.value!.id, // 使用非空断言，因为我们已经检查过了
      }))

      // 等待文件上传完成
      const uploadResults = await uploadPromise

      // 处理上传结果，添加成功上传的文件元数据
      if (uploadResults instanceof Map) {
        for (const fileData of filesToUpload) {
          const result = uploadResults.get(fileData.hash)
          if (result?.success) {
            // 移除 file 字段，只保留元数据
            const { file, ...metadata } = fileData
            allMetadata.push({
              ...metadata,
              path: result.path,
              user_id: currentUser.value!.id, // 添加 user_id，使用非空断言
            })
          }
          else {
            console.error(`文件 ${fileData.hash} 上传失败:`, result?.error)
          }
        }
      }

      // 批量更新文件元数据到数据库
      if (allMetadata.length > 0) {
        const { error } = await supabase
          .from('files')
          .upsert(allMetadata, { onConflict: 'hash' })

        if (error) {
          console.error('批量更新文件元数据失败:', error)
          return false
        }
      }

      // 成功处理文件
      return true
    }
    catch (error) {
      console.error('批量更新文件异常:', error)
      return false
    }
  }

  // 批量插入或更新文件引用数据
  async function upsertFileRefs(fileRefs: any[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('note_files')
        .upsert(fileRefs, { onConflict: 'id' })

      if (error) {
        console.error('批量更新文件引用失败:', error)
        return false
      }

      // 成功更新文件引用到云端
      return true
    }
    catch (error) {
      console.error('批量更新文件引用异常:', error)
      return false
    }
  }

  // 硬删除笔记数据
  async function deleteNotes(noteUuids: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .in('uuid', noteUuids)

      if (error) {
        console.error('删除笔记失败:', error)
        return false
      }

      // 成功删除笔记
      return true
    }
    catch (error) {
      console.error('删除笔记异常:', error)
      return false
    }
  }

  // 硬删除文件数据
  async function deleteFiles(fileHashes: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .in('hash', fileHashes)

      if (error) {
        console.error('删除文件失败:', error)
        return false
      }

      // 成功删除文件
      return true
    }
    catch (error) {
      console.error('删除文件异常:', error)
      return false
    }
  }

  // 硬删除文件引用数据
  async function deleteFileRefs(refIds: number[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('note_files')
        .delete()
        .in('id', refIds)

      if (error) {
        console.error('删除文件引用失败:', error)
        return false
      }

      // 成功删除文件引用
      return true
    }
    catch (error) {
      console.error('删除文件引用异常:', error)
      return false
    }
  }

  // 批量上传文件并更新元数据
  async function uploadAndUpsertFiles(files: TypedFile[]): Promise<{
    success: boolean
    uploaded: number
    failed: number
    errors: Map<string, string>
  }> {
    if (!currentUser.value) {
      return {
        success: false,
        uploaded: 0,
        failed: files.length,
        errors: new Map([['all', '用户未登录']]),
      }
    }

    const errors = new Map<string, string>()
    let uploaded = 0
    let failed = 0

    try {
      // 上传文件到存储
      const uploadResults = await uploadFilesToStorage(
        files.filter(f => f.file instanceof File),
        currentUser.value.id,
      )

      // 准备要更新的文件元数据
      const successfulFiles: any[] = []

      for (const file of files) {
        const uploadResult = uploadResults.get(file.hash)

        if (uploadResult?.success) {
          uploaded++
          const { file: fileObj, ...metadata } = file
          successfulFiles.push({
            ...metadata,
            path: uploadResult.path,
            user_id: currentUser.value.id,
          })
        }
        else {
          failed++
          errors.set(file.hash, uploadResult?.error || '未知错误')
        }
      }

      // 批量更新成功上传的文件元数据
      if (successfulFiles.length > 0) {
        const success = await upsertFiles(successfulFiles)
        if (!success) {
          // 如果元数据更新失败，将这些文件标记为失败
          failed += successfulFiles.length
          uploaded -= successfulFiles.length
          errors.set('metadata', '元数据更新失败')
        }
      }

      return {
        success: failed === 0,
        uploaded,
        failed,
        errors,
      }
    }
    catch (error) {
      console.error('文件上传和更新失败:', error)
      return {
        success: false,
        uploaded: 0,
        failed: files.length,
        errors: new Map([['all', error instanceof Error ? error.message : '未知错误']]),
      }
    }
  }

  return {
    getUserNotes,
    getUserFiles,
    getUserFileRefs,
    getNoteStats,
    getFileStats,
    getFileRefStats,
    upsertNotes,
    upsertFiles,
    upsertFileRefs,
    deleteNotes,
    deleteFiles,
    deleteFileRefs,
    uploadAndUpsertFiles,
  }
}
