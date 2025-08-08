import type { DataConverter, FileRefSyncOperations, FileSyncOperations, NoteSyncOperations, SyncConfig, SyncHandler, SyncStatus } from '../types/sync'
import type { FileRef, Note, TypedFile } from '@/types'
import { ref } from 'vue'
import { useDexie } from '@/hooks/useDexie'
import { sortNotesByHierarchy } from '../utils/noteHelpers'
import { analyzeSyncOperations, executeFileSyncOperations, executeSyncOperations, getLastSyncTime, saveLastSyncTime } from '../utils/syncEngine'
import { useSupabaseAuth } from './useSupabaseAuth'
import { useSupabaseData } from './useSupabaseData'

export function useSupabaseSync() {
  const { db } = useDexie()
  const { getUserNotes, getUserFiles, getUserFileRefs, upsertNotes, upsertFiles, upsertFileRefs, deleteNotes, deleteFiles, deleteFileRefs, uploadAndUpsertFiles } = useSupabaseData()
  const { isLoggedIn } = useSupabaseAuth()

  // 同步状态
  const syncStatus = ref<SyncStatus>({
    isSync: false,
    progress: 0,
    currentStep: '',
  })

  // 同步配置
  const syncConfig: SyncConfig = {
    lastSyncTime: 0,
    deletionGracePeriod: 30 * 24 * 60 * 60 * 1000, // 30天
  }

  // 定义各种数据的同步处理器
  const noteHandler: SyncHandler<Note> = {
    getKey: note => note.uuid,
    getTimestamp: note => new Date(note.lastdotime).getTime(),
    isDeleted: note => note.isdeleted === 1,
  }

  const fileHandler: SyncHandler<TypedFile> = {
    getKey: file => file.hash,
    getTimestamp: file => new Date(file.lastdotime).getTime(),
    isDeleted: file => file.isdeleted === 1,
  }

  const fileRefHandler: SyncHandler<FileRef> = {
    getKey: ref => `${ref.hash}-${ref.refid}`,
    getTimestamp: ref => new Date(ref.lastdotime).getTime(),
  }

  // 创建一个简单的转换器，直接返回数据
  const identityConverter = <T>(): DataConverter<T, T> => ({
    toLocal: (data: T) => data,
    toRemote: (data: T) => data,
  })

  // 增量同步笔记：只同步指定时间戳之后的数据
  async function incrementalNoteSync(lastSyncTime: number = 0): Promise<boolean> {
    if (!isLoggedIn.value || !db.value) {
      console.error('用户未登录或数据库未初始化')
      return false
    }

    try {
      syncStatus.value = {
        isSync: true,
        progress: 0,
        currentStep: '开始增量同步笔记...',
      }

      // 获取本地和云端在指定时间之后修改的笔记
      const [supabaseNotes, localNotes] = await Promise.all([
        getUserNotes(), // 这里需要支持时间戳参数的版本
        db.value.note.where('lastdotime').above(new Date(lastSyncTime).toISOString()).toArray(),
      ])

      const operations = await analyzeSyncOperations(supabaseNotes, localNotes, noteHandler, syncConfig)

      await executeSyncOperations(
        operations,
        db.value.note,
        identityConverter<Note>(),
        upsertNotes,
        deleteNotes,
        {
          sortFn: sortNotesByHierarchy,
          getDeleteId: note => note.uuid,
          tableName: '笔记',
        },
      )

      // 更新最后同步时间为当前时间
      await saveLastSyncTime(Date.now())

      syncStatus.value.progress = 100
      syncStatus.value.currentStep = '增量同步完成'
      syncStatus.value.lastSyncTime = new Date()

      return true
    }
    catch (error) {
      console.error('增量同步失败:', error)
      syncStatus.value.error = error instanceof Error ? error.message : '增量同步失败'
      return false
    }
    finally {
      setTimeout(() => {
        syncStatus.value.isSync = false
      }, 1000)
    }
  }

  // 智能同步：根据是否首次同步选择全量或增量
  async function smartNoteSync(): Promise<boolean> {
    const lastSyncTime = await getLastSyncTime()

    if (lastSyncTime === 0) {
      return await bidirectionalSync()
    }
    else {
      return await incrementalNoteSync(lastSyncTime)
    }
  }

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

      const noteOperations = await analyzeSyncOperations(supabaseNotes, localNotes, noteHandler, syncConfig) as NoteSyncOperations
      totalOperations += noteOperations.toUpdate.length + noteOperations.toInsert.length + noteOperations.toUpload.length

      syncStatus.value.progress = 30

      // 第二步：同步文件数据
      syncStatus.value.currentStep = '分析文件数据差异...'

      const [supabaseFiles, localFiles] = await Promise.all([
        getUserFiles(),
        db.value.file.toArray(),
      ])

      const fileOperations = await analyzeSyncOperations(supabaseFiles, localFiles, fileHandler, syncConfig) as FileSyncOperations
      totalOperations += fileOperations.toUpdate.length + fileOperations.toInsert.length + fileOperations.toUpload.length

      syncStatus.value.progress = 50

      // 第三步：同步文件引用数据
      syncStatus.value.currentStep = '分析文件引用数据差异...'

      const [supabaseFileRefs, localFileRefs] = await Promise.all([
        getUserFileRefs(),
        db.value.file_refs.toArray(),
      ])

      const fileRefOperations = await analyzeSyncOperations(supabaseFileRefs, localFileRefs, fileRefHandler, syncConfig) as FileRefSyncOperations
      totalOperations += fileRefOperations.toUpdate.length + fileRefOperations.toInsert.length + fileRefOperations.toUpload.length

      syncStatus.value.progress = 70

      // 执行同步操作（考虑外键约束）
      syncStatus.value.currentStep = `执行同步操作 (${totalOperations} 项)...`

      // 第一阶段：并行执行笔记和文件同步
      const firstPhaseTasks: Promise<void>[] = []

      // 1. 笔记同步任务
      const noteSyncTask = executeSyncOperations(
        noteOperations,
        db.value.note,
        identityConverter<Note>(),
        upsertNotes,
        deleteNotes,
        {
          sortFn: sortNotesByHierarchy,
          getDeleteId: note => note.uuid,
          tableName: '笔记',
          parallel: true, // 启用并行处理
        },
      ).then(() => {
        completedOperations += noteOperations.toUpdate.length + noteOperations.toInsert.length + noteOperations.toUpload.length
        const progress = 70 + (completedOperations / totalOperations) * 20
        syncStatus.value.progress = Math.min(progress, 90)
      })
      firstPhaseTasks.push(noteSyncTask)

      // 2. 文件同步任务（使用专门的文件同步函数）
      const fileSyncTask = executeFileSyncOperations(
        fileOperations,
        db.value.file,
        identityConverter<TypedFile>(),
        upsertFiles,
        uploadAndUpsertFiles, // 使用新的上传函数
        deleteFiles,
        {
          getDeleteId: file => file.hash,
          tableName: '文件',
        },
      ).then(() => {
        completedOperations += fileOperations.toUpdate.length + fileOperations.toInsert.length + fileOperations.toUpload.length
        const progress = 70 + (completedOperations / totalOperations) * 20
        syncStatus.value.progress = Math.min(progress, 90)
      })
      firstPhaseTasks.push(fileSyncTask)

      // 等待第一阶段完成（笔记和文件）
      await Promise.all(firstPhaseTasks)

      // 第二阶段：文件引用同步（需要文件数据已存在）
      syncStatus.value.currentStep = '同步文件引用数据...'
      
      await executeSyncOperations(
        fileRefOperations,
        db.value.file_refs,
        identityConverter<FileRef>(),
        upsertFileRefs,
        deleteFileRefs,
        {
          getDeleteId: ref => ref.id,
          tableName: '文件引用',
          parallel: true, // 启用并行处理
        },
      )
      
      completedOperations += fileRefOperations.toUpdate.length + fileRefOperations.toInsert.length + fileRefOperations.toUpload.length
      syncStatus.value.progress = 95

      // 保存最后同步时间
      await saveLastSyncTime(Date.now())

      syncStatus.value.progress = 100
      syncStatus.value.currentStep = `同步完成 (处理了 ${completedOperations} 项)`
      syncStatus.value.lastSyncTime = new Date()

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

      syncStatus.value.currentStep = '上传笔记数据...'
      syncStatus.value.progress = 20

      // 上传笔记
      if (localNotes.length > 0) {
        const sortedNotes = sortNotesByHierarchy(localNotes)
        await upsertNotes(sortedNotes)
      }

      syncStatus.value.currentStep = '上传文件数据...'
      syncStatus.value.progress = 50

      // 并行上传文件和文件引用
      const uploadTasks: Promise<any>[] = []

      // 上传文件（包含文件内容和元数据）
      if (localFiles.length > 0) {
        uploadTasks.push(
          uploadAndUpsertFiles(localFiles).then((result) => {
            if (!result.success && result.errors.size > 0) {
              console.error('文件上传失败:', result.errors)
            }
          }),
        )
      }

      syncStatus.value.currentStep = '上传文件引用数据...'
      syncStatus.value.progress = 80

      // 上传文件引用
      if (localFileRefs.length > 0) {
        uploadTasks.push(upsertFileRefs(localFileRefs))
      }

      // 等待所有上传任务完成
      await Promise.all(uploadTasks)

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

      return true
    }
    catch (error) {
      console.error('清空本地数据失败:', error)
      return false
    }
  }

  return {
    syncStatus,
    bidirectionalSync,
    fullSyncToSupabase,
    incrementalNoteSync,
    smartNoteSync,
    getLocalDataStats,
    clearLocalData,
    getLastSyncTime,
    saveLastSyncTime,
  }
}
