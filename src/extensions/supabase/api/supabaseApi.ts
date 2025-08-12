import type { FileRef, Note, TypedFile } from '@/types'
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
export async function addSupabaseFile(file: TypedFile) {
  const { data, error } = await supabase
    .from('files')
    .insert(file)
    .select('id')
    .single()

  if (error) {
    throw new Error(`添加Supabase文件失败: ${error.message}`)
  }

  return data.id
}

export async function getSupabaseFile(id: number) {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('id', id)
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
