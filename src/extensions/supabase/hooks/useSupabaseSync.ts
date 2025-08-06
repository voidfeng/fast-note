import type { FileRef, Note, TypedFile } from '@/types'
import { ref } from 'vue'
import { useDexie } from '@/hooks/useDexie'
import { useSupabaseAuth } from './useSupabaseAuth'
import { useSupabaseData } from './useSupabaseData'

// 同步状态
export interface SyncStatus {
  isSync: boolean
  progress: number
  currentStep: string
  error?: string
  lastSyncTime?: Date
}

export function useSupabaseSync() {
  const { db } = useDexie()
  const { getUserNotes, getUserFiles, getUserFileRefs, upsertNotes, upsertFiles, upsertFileRefs } = useSupabaseData()
  const { isLoggedIn } = useSupabaseAuth()

  // 同步状态
  const syncStatus = ref<SyncStatus>({
    isSync: false,
    progress: 0,
    currentStep: '',
  })

  // 双向增量同步：基于时间戳比较
  async function bidirectionalSync(): Promise<boolean> {
    if (!isLoggedIn.value || !db.value) {
      console.error('用户未登录或数据库未初始化')
      return false
    }

    try {
      syncStatus.value = {
        isSync: true,
        progress: 0,
        currentStep: '开始双向同步...',
      }

      let totalOperations = 0
      let completedOperations = 0

      // 第一步：同步笔记数据
      syncStatus.value.currentStep = '分析笔记数据差异...'
      syncStatus.value.progress = 10

      const [supabaseNotes, localNotes] = await Promise.all([
        getUserNotes(),
        db.value.note.toArray(),
      ])

      console.log('云端笔记:', supabaseNotes.length, '条，本地笔记:', localNotes.length, '条')

      const noteOperations = await syncNotes(supabaseNotes, localNotes)
      totalOperations += noteOperations.toUpdate.length + noteOperations.toInsert.length + noteOperations.toUpload.length

      syncStatus.value.progress = 30

      // 第二步：同步文件数据
      syncStatus.value.currentStep = '分析文件数据差异...'

      const [supabaseFiles, localFiles] = await Promise.all([
        getUserFiles(),
        db.value.file.toArray(),
      ])

      console.log('云端文件:', supabaseFiles.length, '条，本地文件:', localFiles.length, '条')

      const fileOperations = await syncFiles(supabaseFiles, localFiles)
      totalOperations += fileOperations.toUpdate.length + fileOperations.toInsert.length + fileOperations.toUpload.length

      syncStatus.value.progress = 50

      // 第三步：同步文件引用数据
      syncStatus.value.currentStep = '分析文件引用数据差异...'

      const [supabaseFileRefs, localFileRefs] = await Promise.all([
        getUserFileRefs(),
        db.value.file_refs.toArray(),
      ])

      console.log('云端文件引用:', supabaseFileRefs.length, '条，本地文件引用:', localFileRefs.length, '条')

      const fileRefOperations = await syncFileRefs(supabaseFileRefs, localFileRefs)
      totalOperations += fileRefOperations.toUpdate.length + fileRefOperations.toInsert.length + fileRefOperations.toUpload.length

      syncStatus.value.progress = 70

      // 执行所有同步操作
      syncStatus.value.currentStep = `执行同步操作 (${totalOperations} 项)...`

      // 执行笔记同步
      await executeNoteSync(noteOperations)
      completedOperations += noteOperations.toUpdate.length + noteOperations.toInsert.length + noteOperations.toUpload.length

      // 执行文件同步
      await executeFileSync(fileOperations)
      completedOperations += fileOperations.toUpdate.length + fileOperations.toInsert.length + fileOperations.toUpload.length

      // 执行文件引用同步
      await executeFileRefSync(fileRefOperations)
      completedOperations += fileRefOperations.toUpdate.length + fileRefOperations.toInsert.length + fileRefOperations.toUpload.length

      syncStatus.value.progress = 100
      syncStatus.value.currentStep = `同步完成 (处理了 ${completedOperations} 项)`
      syncStatus.value.lastSyncTime = new Date()

      console.log('双向同步完成，处理了', completedOperations, '项操作')
      return true
    }
    catch (error) {
      console.error('同步失败:', error)
      syncStatus.value.error = error instanceof Error ? error.message : '同步失败'
      return false
    }
    finally {
      setTimeout(() => {
        syncStatus.value.isSync = false
      }, 1000)
    }
  }

  // 笔记数据同步分析
  async function syncNotes(supabaseNotes: Note[], localNotes: Note[]) {
    const toUpdate: Note[] = [] // 需要更新到本地的
    const toInsert: Note[] = [] // 需要插入到本地的
    const toUpload: Note[] = [] // 需要上传到云端的

    // 创建映射表便于查找
    const localNotesMap = new Map(localNotes.map(note => [note.uuid, note]))
    const supabaseNotesMap = new Map(supabaseNotes.map(note => [note.uuid, note]))

    // 分析云端数据
    for (const supabaseNote of supabaseNotes) {
      const localNote = localNotesMap.get(supabaseNote.uuid)

      if (!localNote) {
        // 本地没有，需要插入
        toInsert.push(supabaseNote)
      }
      else {
        // 比较时间戳
        const supabaseTime = typeof supabaseNote.lastdotime === 'string'
          ? new Date(supabaseNote.lastdotime).getTime()
          : (supabaseNote.lastdotime || 0)
        const localTime = typeof localNote.lastdotime === 'string'
          ? new Date(localNote.lastdotime).getTime()
          : (localNote.lastdotime || 0)

        if (supabaseTime > localTime) {
          // 云端更新，需要更新本地
          toUpdate.push(supabaseNote)
        }
      }
    }

    // 分析本地数据
    for (const localNote of localNotes) {
      const supabaseNote = supabaseNotesMap.get(localNote.uuid)

      if (!supabaseNote) {
        // 云端没有，需要上传
        toUpload.push(localNote)
      }
      else {
        // 比较时间戳
        const supabaseTime = typeof supabaseNote.lastdotime === 'string'
          ? new Date(supabaseNote.lastdotime).getTime()
          : (supabaseNote.lastdotime || 0)
        const localTime = typeof localNote.lastdotime === 'string'
          ? new Date(localNote.lastdotime).getTime()
          : (localNote.lastdotime || 0)

        if (localTime > supabaseTime) {
          // 本地更新，需要上传
          toUpload.push(localNote)
        }
      }
    }

    console.log('笔记同步分析:', {
      toUpdate: toUpdate.length,
      toInsert: toInsert.length,
      toUpload: toUpload.length,
    })

    return { toUpdate, toInsert, toUpload }
  }

  // 文件数据同步分析
  async function syncFiles(supabaseFiles: TypedFile[], localFiles: TypedFile[]) {
    const toUpdate: TypedFile[] = []
    const toInsert: TypedFile[] = []
    const toUpload: TypedFile[] = []

    const localFilesMap = new Map(localFiles.map(file => [file.hash, file]))
    const supabaseFilesMap = new Map(supabaseFiles.map(file => [file.hash, file]))

    // 分析云端数据
    for (const supabaseFile of supabaseFiles) {
      const localFile = localFilesMap.get(supabaseFile.hash)

      if (!localFile) {
        toInsert.push(supabaseFile)
      }
      else {
        const supabaseTime = typeof supabaseFile.lastdotime === 'string'
          ? new Date(supabaseFile.lastdotime).getTime()
          : (supabaseFile.lastdotime || 0)
        const localTime = typeof localFile.lastdotime === 'string'
          ? new Date(localFile.lastdotime).getTime()
          : (localFile.lastdotime || 0)

        if (supabaseTime > localTime) {
          toUpdate.push(supabaseFile)
        }
      }
    }

    // 分析本地数据
    for (const localFile of localFiles) {
      const supabaseFile = supabaseFilesMap.get(localFile.hash)

      if (!supabaseFile) {
        toUpload.push(localFile)
      }
      else {
        const supabaseTime = typeof supabaseFile.lastdotime === 'string'
          ? new Date(supabaseFile.lastdotime).getTime()
          : (supabaseFile.lastdotime || 0)
        const localTime = typeof localFile.lastdotime === 'string'
          ? new Date(localFile.lastdotime).getTime()
          : (localFile.lastdotime || 0)

        if (localTime > supabaseTime) {
          toUpload.push(localFile)
        }
      }
    }

    console.log('文件同步分析:', {
      toUpdate: toUpdate.length,
      toInsert: toInsert.length,
      toUpload: toUpload.length,
    })

    return { toUpdate, toInsert, toUpload }
  }

  // 文件引用数据同步分析
  async function syncFileRefs(supabaseFileRefs: FileRef[], localFileRefs: FileRef[]) {
    const toUpdate: FileRef[] = []
    const toInsert: FileRef[] = []
    const toUpload: FileRef[] = []

    const localFileRefsMap = new Map(localFileRefs.map(ref => [`${ref.hash}-${ref.refid}`, ref]))
    const supabaseFileRefsMap = new Map(supabaseFileRefs.map(ref => [`${ref.hash}-${ref.refid}`, ref]))

    // 分析云端数据
    for (const supabaseRef of supabaseFileRefs) {
      const key = `${supabaseRef.hash}-${supabaseRef.refid}`
      const localRef = localFileRefsMap.get(key)

      if (!localRef) {
        toInsert.push(supabaseRef)
      }
      else {
        const supabaseTime = typeof supabaseRef.lastdotime === 'string'
          ? new Date(supabaseRef.lastdotime).getTime()
          : (supabaseRef.lastdotime || 0)
        const localTime = typeof localRef.lastdotime === 'string'
          ? new Date(localRef.lastdotime).getTime()
          : (localRef.lastdotime || 0)

        if (supabaseTime > localTime) {
          toUpdate.push(supabaseRef)
        }
      }
    }

    // 分析本地数据
    for (const localRef of localFileRefs) {
      const key = `${localRef.hash}-${localRef.refid}`
      const supabaseRef = supabaseFileRefsMap.get(key)

      if (!supabaseRef) {
        toUpload.push(localRef)
      }
      else {
        const supabaseTime = typeof supabaseRef.lastdotime === 'string'
          ? new Date(supabaseRef.lastdotime).getTime()
          : (supabaseRef.lastdotime || 0)
        const localTime = typeof localRef.lastdotime === 'string'
          ? new Date(localRef.lastdotime).getTime()
          : (localRef.lastdotime || 0)

        if (localTime > supabaseTime) {
          toUpload.push(localRef)
        }
      }
    }

    console.log('文件引用同步分析:', {
      toUpdate: toUpdate.length,
      toInsert: toInsert.length,
      toUpload: toUpload.length,
    })

    return { toUpdate, toInsert, toUpload }
  }

  // 全量同步：从本地 IndexedDB 同步到 Supabase
  async function fullSyncToSupabase(): Promise<boolean> {
    if (!isLoggedIn.value || !db.value) {
      console.error('用户未登录或数据库未初始化')
      return false
    }

    try {
      syncStatus.value = {
        isSync: true,
        progress: 0,
        currentStep: '准备上传到云端...',
      }

      // 获取本地数据
      const localNotes = await db.value.note.toArray()
      const localFiles = await db.value.file.toArray()
      const localFileRefs = await db.value.file_refs.toArray()

      console.log('本地数据统计:', {
        notes: localNotes.length,
        files: localFiles.length,
        fileRefs: localFileRefs.length,
      })

      // TODO: 实现上传到 Supabase 的逻辑
      // 这里需要调用 Supabase 的插入/更新 API

      syncStatus.value.progress = 100
      syncStatus.value.currentStep = '上传完成'
      syncStatus.value.lastSyncTime = new Date()

      return true
    }
    catch (error) {
      console.error('上传同步失败:', error)
      syncStatus.value.error = error instanceof Error ? error.message : '上传同步失败'
      return false
    }
    finally {
      setTimeout(() => {
        syncStatus.value.isSync = false
      }, 1000)
    }
  }

  // 获取本地数据统计
  async function getLocalDataStats() {
    if (!db.value)
      return { notes: 0, files: 0, fileRefs: 0 }

    try {
      const [notesCount, filesCount, fileRefsCount] = await Promise.all([
        db.value.note.count(),
        db.value.file.count(),
        db.value.file_refs.count(),
      ])

      return {
        notes: notesCount,
        files: filesCount,
        fileRefs: fileRefsCount,
      }
    }
    catch (error) {
      console.error('获取本地数据统计失败:', error)
      return { notes: 0, files: 0, fileRefs: 0 }
    }
  }

  // 清空本地数据
  async function clearLocalData(): Promise<boolean> {
    if (!db.value)
      return false

    try {
      await Promise.all([
        db.value.note.clear(),
        db.value.file.clear(),
        db.value.file_refs.clear(),
      ])

      console.log('本地数据已清空')
      return true
    }
    catch (error) {
      console.error('清空本地数据失败:', error)
      return false
    }
  }

  // 数据转换函数：Supabase 格式转本地格式
  function convertSupabaseNoteToLocal(supabaseNote: any): Note {
    return {
      uuid: supabaseNote.uuid,
      type: supabaseNote.type || 0,
      puuid: supabaseNote.puuid || '',
      title: supabaseNote.title || '',
      newstext: supabaseNote.newstext || '',
      lastdotime: supabaseNote.lastdotime ? new Date(supabaseNote.lastdotime).getTime() : Date.now(),
      // 其他字段根据需要添加
    }
  }

  function convertSupabaseFileToLocal(supabaseFile: any): TypedFile {
    return {
      hash: supabaseFile.hash,
      id: supabaseFile.id || '',
      url: supabaseFile.url || '',
      ids: supabaseFile.ids || '',
      lastdotime: supabaseFile.lastdotime ? new Date(supabaseFile.lastdotime).getTime() : Date.now(),
    }
  }

  function convertSupabaseFileRefToLocal(supabaseFileRef: any): FileRef {
    return {
      id: supabaseFileRef.id,
      hash: supabaseFileRef.hash,
      refid: supabaseFileRef.refid,
      lastdotime: supabaseFileRef.lastdotime ? new Date(supabaseFileRef.lastdotime).getTime() : Date.now(),
    }
  }

  // 数据转换函数：本地格式转 Supabase 格式
  function convertLocalNoteToSupabase(localNote: Note) {
    return {
      uuid: localNote.uuid,
      type: localNote.type,
      puuid: localNote.puuid || null, // 确保空字符串转换为 null
      title: localNote.title,
      newstext: localNote.newstext,
      lastdotime: new Date(localNote.lastdotime || Date.now()).toISOString(),
    }
  }

  function convertLocalFileToSupabase(localFile: TypedFile) {
    return {
      hash: localFile.hash,
      id: localFile.id,
      url: localFile.url,
      ids: localFile.ids,
      lastdotime: new Date(localFile.lastdotime || Date.now()).toISOString(),
    }
  }

  function convertLocalFileRefToSupabase(localFileRef: FileRef) {
    return {
      id: localFileRef.id,
      hash: localFileRef.hash,
      refid: localFileRef.refid,
      lastdotime: new Date(localFileRef.lastdotime || Date.now()).toISOString(),
    }
  }

  // 执行笔记同步操作
  async function executeNoteSync(operations: { toUpdate: Note[], toInsert: Note[], toUpload: Note[] }) {
    if (!db.value)
      return

    // 更新本地数据
    if (operations.toUpdate.length > 0) {
      const localNotes = operations.toUpdate.map(convertSupabaseNoteToLocal)
      await db.value.note.bulkPut(localNotes)
      console.log(`更新了 ${localNotes.length} 条本地笔记`)
    }

    // 插入本地数据
    if (operations.toInsert.length > 0) {
      const localNotes = operations.toInsert.map(convertSupabaseNoteToLocal)
      await db.value.note.bulkAdd(localNotes)
      console.log(`插入了 ${localNotes.length} 条本地笔记`)
    }

    // 上传到云端 - 需要按层级顺序上传，确保父笔记先于子笔记
    if (operations.toUpload.length > 0) {
      const supabaseNotes = operations.toUpload.map(convertLocalNoteToSupabase)

      // 按层级排序：根笔记(puuid为空)优先，然后按puuid层级排序
      const sortedNotes = sortNotesByHierarchy(supabaseNotes)

      const success = await upsertNotes(sortedNotes)
      if (success) {
        console.log(`成功上传 ${operations.toUpload.length} 条笔记到云端`)
      }
      else {
        console.error(`上传 ${operations.toUpload.length} 条笔记到云端失败`)
      }
    }
  }

  // 按层级排序笔记，确保父笔记在子笔记之前
  function sortNotesByHierarchy(notes: any[]): any[] {
    const noteMap = new Map(notes.map(note => [note.uuid, note]))
    const sorted: any[] = []
    const visited = new Set<string>()

    // 深度优先遍历，确保父笔记先被添加
    function addNoteWithParents(note: any) {
      if (visited.has(note.uuid)) {
        return
      }

      // 如果有父笔记且父笔记在待上传列表中，先添加父笔记
      if (note.puuid && noteMap.has(note.puuid)) {
        addNoteWithParents(noteMap.get(note.puuid))
      }

      // 添加当前笔记
      if (!visited.has(note.uuid)) {
        sorted.push(note)
        visited.add(note.uuid)
      }
    }

    // 遍历所有笔记
    for (const note of notes) {
      addNoteWithParents(note)
    }

    return sorted
  }

  // 执行文件同步操作
  async function executeFileSync(operations: { toUpdate: TypedFile[], toInsert: TypedFile[], toUpload: TypedFile[] }) {
    if (!db.value)
      return

    // 更新本地数据
    if (operations.toUpdate.length > 0) {
      const localFiles = operations.toUpdate.map(convertSupabaseFileToLocal)
      await db.value.file.bulkPut(localFiles)
      console.log(`更新了 ${localFiles.length} 条本地文件`)
    }

    // 插入本地数据
    if (operations.toInsert.length > 0) {
      const localFiles = operations.toInsert.map(convertSupabaseFileToLocal)
      await db.value.file.bulkAdd(localFiles)
      console.log(`插入了 ${localFiles.length} 条本地文件`)
    }

    // 上传到云端
    if (operations.toUpload.length > 0) {
      const supabaseFiles = operations.toUpload.map(convertLocalFileToSupabase)
      const success = await upsertFiles(supabaseFiles)
      if (success) {
        console.log(`成功上传 ${operations.toUpload.length} 条文件到云端`)
      }
      else {
        console.error(`上传 ${operations.toUpload.length} 条文件到云端失败`)
      }
    }
  }

  // 执行文件引用同步操作
  async function executeFileRefSync(operations: { toUpdate: FileRef[], toInsert: FileRef[], toUpload: FileRef[] }) {
    if (!db.value)
      return

    // 更新本地数据
    if (operations.toUpdate.length > 0) {
      const localFileRefs = operations.toUpdate.map(convertSupabaseFileRefToLocal)
      await db.value.file_refs.bulkPut(localFileRefs)
      console.log(`更新了 ${localFileRefs.length} 条本地文件引用`)
    }

    // 插入本地数据
    if (operations.toInsert.length > 0) {
      const localFileRefs = operations.toInsert.map(convertSupabaseFileRefToLocal)
      await db.value.file_refs.bulkAdd(localFileRefs)
      console.log(`插入了 ${localFileRefs.length} 条本地文件引用`)
    }

    // 上传到云端
    if (operations.toUpload.length > 0) {
      const supabaseFileRefs = operations.toUpload.map(convertLocalFileRefToSupabase)
      const success = await upsertFileRefs(supabaseFileRefs)
      if (success) {
        console.log(`成功上传 ${operations.toUpload.length} 条文件引用到云端`)
      }
      else {
        console.error(`上传 ${operations.toUpload.length} 条文件引用到云端失败`)
      }
    }
  }

  return {
    syncStatus,
    bidirectionalSync,
    fullSyncToSupabase,
    getLocalDataStats,
    clearLocalData,
  }
}
