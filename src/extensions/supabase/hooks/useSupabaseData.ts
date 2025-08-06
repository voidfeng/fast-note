import type { FileRef, Note, TypedFile } from '@/types'
import { supabase } from '../api/supabaseClient'

export function useSupabaseData() {
  // 获取用户的笔记数据
  async function getUserNotes(): Promise<Note[]> {
    try {
      const { data, error } = await supabase
        .from('note')
        .select('*')
        .order('lastdotime', { ascending: false })
        .limit(50)

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

  // 获取用户的文件数据
  async function getUserFiles(): Promise<TypedFile[]> {
    try {
      const { data, error } = await supabase
        .from('file')
        .select('*')
        .order('lastdotime', { ascending: false })
        .limit(50)

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

  // 获取用户的文件引用数据
  async function getUserFileRefs(): Promise<FileRef[]> {
    try {
      const { data, error } = await supabase
        .from('file_refs')
        .select('*')
        .order('lastdotime', { ascending: false })
        .limit(50)

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
        .from('note')
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
        .from('file')
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
        .from('file_refs')
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
          .from('note')
          .upsert([note], { onConflict: 'uuid' })

        if (error) {
          console.error(`插入笔记 ${note.uuid} 失败:`, error)
          // 继续处理其他笔记，不中断整个流程
        }
        else {
          successCount++
        }
      }

      console.log(`成功更新 ${successCount}/${notes.length} 条笔记到云端`)
      return successCount > 0
    }
    catch (error) {
      console.error('批量更新笔记异常:', error)
      return false
    }
  }

  // 批量插入或更新文件数据
  async function upsertFiles(files: any[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('file')
        .upsert(files, { onConflict: 'hash' })

      if (error) {
        console.error('批量更新文件失败:', error)
        return false
      }

      console.log(`成功更新 ${files.length} 条文件到云端`)
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
        .from('file_refs')
        .upsert(fileRefs, { onConflict: 'id' })

      if (error) {
        console.error('批量更新文件引用失败:', error)
        return false
      }

      console.log(`成功更新 ${fileRefs.length} 条文件引用到云端`)
      return true
    }
    catch (error) {
      console.error('批量更新文件引用异常:', error)
      return false
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
  }
}
