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

// 文件相关 API
export async function addSupabaseFile(file: TypedFile & { file: File }) {
  // 1. 先上传文件到 Supabase Storage
  const fileExtension = mimeToExtension[file.file.type] || file.file.name.split('.').pop() || 'bin'
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const fileName = `${year}/${month}/${file.hash}.${fileExtension}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('note-private-files')
    .upload(fileName, file.file)

  if (uploadError) {
    throw new Error(`上传文件到存储失败: ${uploadError.message}`)
  }

  // 2. 获取文件的公共 URL
  const { data: urlData } = supabase.storage
    .from('note-private-files')
    .getPublicUrl(fileName)

  // 3. 准备文件记录数据
  const fileRecord = {
    ...file,
    url: urlData.publicUrl,
    storage_path: fileName,
    size: file.file.size,
    type: file.file.type,
  }

  // 移除 file 属性，因为数据库不需要存储 File 对象
  delete (fileRecord as any).file

  // 4. 在数据库中新增文件记录
  const { data, error } = await supabase
    .from('note-private-files')
    .insert(fileRecord)
    .select('id')
    .single()

  if (error) {
    // 如果数据库插入失败，删除已上传的文件
    await supabase.storage
      .from('note-private-files')
      .remove([fileName])

    throw new Error(`添加Supabase文件失败: ${error.message}`)
  }

  return data.id
}

export async function getSupabaseFile(hash: string) {
  const { data, error } = await supabase
    .from('files')
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
