import type { FileRef, Note, TypedFile } from '@/types'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'
import { uploadFileToStorage } from '../utils/fileStorage'
import { supabase } from './supabaseClient'

// 笔记相关 API
export async function getSupabaseNodesByLastdotime(lastdotime: string) {
  const { data, error } = await supabase
    .from('note')
    .select('*')
    .gt('lastdotime', lastdotime)
    .order('lastdotime', { ascending: true })

  if (error) {
    throw new Error(`获取Supabase笔记失败: ${error.message}`)
  }

  return { d: data || [] }
}

export async function addSupabaseNote(note: Note) {
  const { data, error } = await supabase
    .from('note')
    .insert(note)
    .select('uuid')
    .single()

  if (error) {
    throw new Error(`添加Supabase笔记失败: ${error.message}`)
  }

  return data.uuid
}

export async function updateSupabaseNote(note: Note) {
  const { error } = await supabase
    .from('note')
    .update(note)
    .eq('uuid', note.uuid)

  if (error) {
    throw new Error(`更新Supabase笔记失败: ${error.message}`)
  }

  return true
}

// 文件引用相关 API
export async function getSupabaseFileRefsByLastdotime(lastdotime: string) {
  const { data, error } = await supabase
    .from('file_refs')
    .select('*')
    .gt('lastdotime', lastdotime)
    .order('lastdotime', { ascending: true })

  if (error) {
    throw new Error(`获取Supabase文件引用失败: ${error.message}`)
  }

  return { d: data || [] }
}

export async function addSupabaseFileRef(fileRef: FileRef) {
  const { data, error } = await supabase
    .from('file_refs')
    .insert(fileRef)
    .select('id')
    .single()

  if (error) {
    console.log(error)
    if (error.message.includes('duplicate key value violates unique constraint')) {
      return true
    }
    throw new Error(`添加Supabase文件引用失败: ${error.message}`)
  }

  return data.id
}

export async function updateSupabaseFileRef(fileRef: FileRef) {
  const { error } = await supabase
    .from('file_refs')
    .update(fileRef)
    .eq('id', fileRef.id)

  if (error) {
    throw new Error(`更新Supabase文件引用失败: ${error.message}`)
  }

  return true
}

// 文件相关 API
export async function addSupabaseFile(file: TypedFile & { file: File }) {
  const { currentUser } = useSupabaseAuth()

  // 上传文件到存储
  const uploadResult = await uploadFileToStorage(file.file, currentUser.value!.id, file.hash)
  if (!uploadResult.success) {
    throw new Error(`上传文件到存储失败: ${uploadResult.error}`)
  }

  // 在数据库中新增文件记录
  const { data, error } = await supabase
    .from('file')
    .insert({
      hash: file.hash,
      path: uploadResult.path,
      name: file.file.name,
      size: file.file.size,
      type: file.file.type,
      user_id: currentUser.value!.id,
      lastdotime: new Date().toISOString(),
      isdeleted: 0,
    })
    .select('hash')
    .single()

  return uploadResult.path
}

export async function getSupabaseFilesByLastdotime(lastdotime: string) {
  const { data, error } = await supabase
    .from('file')
    .select('*')
    .gt('lastdotime', lastdotime)
    .order('lastdotime', { ascending: true })

  if (error) {
    throw new Error(`获取Supabase文件失败: ${error.message}`)
  }

  return { d: data || [] }
}

export async function getSupabaseFile(hash: string) {
  const { data, error } = await supabase
    .from('file')
    .select('*')
    .eq('hash', hash)
    .single()

  if (error) {
    throw new Error(`获取Supabase文件失败: ${error.message}`)
  }

  return { d: data }
}

export async function deleteSupabaseFile(id: number) {
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`删除Supabase文件失败: ${error.message}`)
  }

  return true
}
