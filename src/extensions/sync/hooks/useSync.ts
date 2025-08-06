import type { FileRef, Note } from '@/types'
import { ref } from 'vue'
import { useFileRefs } from '@/hooks/useFileRefs'
import { useFiles } from '@/hooks/useFiles'
import { useNote } from '@/hooks/useNote'
import { getTime } from '@/utils/date'
import {
  addCloudFile,
  addCloudFileRef,
  addCloudNote,
  deleteCloudFile,
  getCloudFile,
  getCloudFileRefsByLastdotime,
  getCloudNodesByLastdotime,
  updateCloudFileRef,
  updateCloudNote,
} from '../api/syncApi'

const defaultLastdotime = getTime('2010/01/01 00:00:00')
const lastdotime = ref(JSON.parse(localStorage.lastdotime || defaultLastdotime))
const fileRefLastdotime = ref(JSON.parse(localStorage.fileRefLastdotime || defaultLastdotime))

const syncing = ref(false)
// 存储同步成功的回调函数
const syncSyncedCallbacks: Array<(result?: any) => void> = []

export function useSync() {
  const { getNotesByLastdotime, getNote, addNote, deleteNote, updateNote } = useNote()

  // 注册同步成功的回调函数
  function onSynced(callback: (result?: any) => void) {
    if (typeof callback === 'function') {
      syncSyncedCallbacks.push(callback)
    }

    // 返回取消注册的函数
    return () => offOnSynced(callback)
  }

  // 移除同步成功的回调函数
  function offOnSynced(callback: (result?: any) => void) {
    const index = syncSyncedCallbacks.indexOf(callback)
    if (index !== -1) {
      syncSyncedCallbacks.splice(index, 1)
    }
  }

  // 触发同步成功的回调函数
  function triggerSyncedCallbacks(result?: any) {
    for (const callback of syncSyncedCallbacks) {
      try {
        callback(result)
      }
      catch (error) {
        console.error('执行同步成功回调函数失败:', error)
      }
    }
  }

  async function sync() {
    syncing.value = true

    try {
      await syncNote()
      // 已做了删除云端附件处理，同步文件无需处理
      await syncFileRefs()
      await syncFile()

      triggerSyncedCallbacks()
    }
    catch (error) {
      console.error('同步失败', error)
    }
    finally {
      syncing.value = false
    }
  }

  // 同步备忘录
  async function syncNote() {
    // 获取本地变更数据
    const localNotes = await getNotesByLastdotime(lastdotime.value)
    // 获取云端变更数据
    const cloudNotes = await getCloudNodesByLastdotime(lastdotime.value)
    // newstext 转义
    cloudNotes.d.forEach((note: Note) => {
      note.newstext = note.newstext.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    })

    // 合并 本地的备忘录 和 云端的备忘录: 移除本地
    // const localDefaultFoler = localNotes.find(note => note.ftitle === 'default-folder')
    // const cloudDefaultFoler = cloudNotes.d.find((note: Note) => note.ftitle === 'default-folder')
    // if (localDefaultFoler && cloudDefaultFoler) {
    //   const index = localNotes.indexOf(localDefaultFoler)
    //   localNotes.splice(index, 1)
    //   await deleteNote(localDefaultFoler.uuid)
    //   const changePUuidNotes = await getNotesByPUuid(localDefaultFoler.uuid)
    //   for (const note of changePUuidNotes) {
    //     note.puuid = cloudDefaultFoler.uuid
    //     await updateNote(note.uuid, note)
    //   }
    // }

    // 创建UUID映射以便快速查找
    const localNotesMap = new Map(localNotes.map(note => [note.uuid, note]))
    const cloudNotesMap = new Map((cloudNotes.d as Note[]).map(note => [note.uuid, note]))

    // 准备需要处理的操作列表
    interface SyncOperation {
      note: Note
      action: 'upload' | 'update' | 'download' | 'delete' | 'deleteLocal'
    }

    const operations: SyncOperation[] = []
    const now = Math.floor(Date.now() / 1000) // 当前秒级时间戳
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60 // 30天的秒数

    // 处理本地笔记
    for (const note of localNotes) {
      const cloudNote = cloudNotesMap.get(note.uuid)

      // 处理本地已删除的笔记
      if (note.isdeleted === 1) {
        // 如果删除时间超过30天
        if (now - note.lastdotime > thirtyDaysInSeconds) {
          // 从本地删除
          operations.push({ note, action: 'deleteLocal' })

          // 如果云端有此笔记，请求云端删除API接口
          if (cloudNote) {
            const noteToUpdate = { ...note, id: cloudNote.id }
            operations.push({ note: noteToUpdate, action: 'delete' })
          }
          continue
        }

        // 如果删除时间在30天内
        // 如果云端不存在此笔记，上传删除状态到云端
        if (!cloudNote) {
          operations.push({ note, action: 'upload' })
          continue
        }

        // 如果本地版本更新，上传删除状态到云端
        const localVersion = note.version || 0
        const cloudVersion = cloudNote.version || 0

        if (localVersion > cloudVersion) {
          const noteToUpdate = { ...note, id: cloudNote.id }
          operations.push({ note: noteToUpdate, action: 'update' })
        }
        continue
      }

      // 处理未删除的笔记（原有逻辑）
      if (!cloudNote) {
        // 本地存在但云端为变更 - 更新或新增到云端
        if (note.id) {
          operations.push({ note, action: 'update' })
        }
        else {
          operations.push({ note, action: 'upload' })
        }
      }
      else {
        // 本地和云端都存在 - 比较版本号
        const localLastdotime = note.lastdotime
        const cloudLastdotime = cloudNote.lastdotime

        if (localLastdotime > cloudLastdotime) {
          // 本地版本更新，上传到云端
          const noteToUpdate = { ...note, id: cloudNote.id }
          operations.push({ note: noteToUpdate, action: 'update' })
        }
        else if (localLastdotime < cloudLastdotime) {
          // 云端版本更新，下载到本地
          operations.push({ note: cloudNote, action: 'download' })
        }
      }
    }

    // 处理云端笔记
    for (const note of cloudNotes.d as Note[]) {
      const localNote = localNotesMap.get(note.uuid)

      // 处理云端已删除的笔记
      if (note.isdeleted === 1) {
        // 如果删除时间超过30天且本地存在，从本地删除
        if (now - note.lastdotime > thirtyDaysInSeconds) {
          if (localNote) {
            operations.push({ note, action: 'deleteLocal' })
          }
          continue
        }

        // 如果本地不存在且删除时间在30天内，下载到本地
        if (!localNote) {
          operations.push({ note, action: 'download' })
          continue
        }

        // 如果本地存在，比较版本
        const localVersion = localNote.version || 0
        const cloudVersion = note.version || 0

        if (cloudVersion > localVersion) {
          // 云端版本更新，更新本地数据
          operations.push({ note, action: 'download' })
        }
        continue
      }

      // 处理未删除的笔记（原有逻辑）
      if (!localNote) {
        // 云端存在但本地不存在 - 下载到本地
        operations.push({ note, action: 'download' })
      }
      else {
        // 本地和云端都存在 - 比较版本号
        const localVersion = localNote.version || 0
        const cloudVersion = note.version || 0

        if (cloudVersion > localVersion) {
          // 云端版本更新，更新本地数据
          operations.push({ note, action: 'download' })
        }
      }
    }

    // 按照lastdotime顺序排序所有操作
    operations.sort((a, b) => a.note.lastdotime - b.note.lastdotime)
    // 统计同步结果
    let uploadedCount = 0
    let downloadedCount = 0
    let deletedCount = 0

    // 按顺序执行所有同步操作
    for (const { note, action } of operations) {
      try {
        if (action === 'upload') {
          const id = await addCloudNote(note)
          note.id = Number.parseInt(id as string)
          await updateNote(note.uuid, note)
          uploadedCount++
        }
        else if (action === 'update') {
          await updateCloudNote(note)
          uploadedCount++
        }
        else if (action === 'download') {
          const localNote = await getNote(note.uuid)
          if (localNote) {
            await updateNote(note.uuid, note)
          }
          else {
            await addNote(note)
          }
          downloadedCount++
        }
        else if (action === 'deleteLocal') {
          await deleteNote(note.uuid)
          deletedCount++
        }
        else if (action === 'delete') {
          // 请求云端删除API接口
          await updateCloudNote(note) // 或者使用专门的删除API
          deletedCount++
        }

        // 每成功同步一条记录，就更新lastdotime
        if (note.lastdotime > lastdotime.value) {
          lastdotime.value = note.lastdotime
          localStorage.lastdotime = JSON.stringify(note.lastdotime)
        }
      }
      catch (error) {
        console.error(`同步操作失败 (${action}):`, error)
        // 继续处理下一条记录
      }
    }

    return {
      uploaded: uploadedCount,
      downloaded: downloadedCount,
      deleted: deletedCount,
    }
  }

  /**
   * 同步引用表
   * 1. 获取本地引用表 和 云端引用表
   * 2. 合并本地引用表 和 云端引用表
   *   - 如果本地和云端都存在，则比较lastdotime，如果本地lastdotime大于云端，则上传到云端，否则更新本地
   * 3. 检查是否引用为 0 的文件，如果为 0 则标记删除 （延迟 14 天删除）
   * 4. 服务端为处理僵尸引用，每个引用需要在编辑文件后更新引用表的lastdotime
   */
  async function syncFileRefs() {
    const { getFileRefsByLastdotime, updateFileRef, getRefCount } = useFileRefs()
    const { getFileByHash, deleteFile, updateFile } = useFiles()

    // 1. 获取本地引用表和云端引用表
    const localFileRefs = await getFileRefsByLastdotime(fileRefLastdotime.value)
    const cloudFileRefs = await getCloudFileRefsByLastdotime(fileRefLastdotime.value)

    if (!localFileRefs || !cloudFileRefs || !cloudFileRefs.d) {
      console.warn('获取文件引用失败', localFileRefs, cloudFileRefs)
      return
    }

    // 创建映射以便快速查找
    const localFileRefsMap = new Map(localFileRefs.map(ref => [`${ref.hash}-${ref.refid}`, ref]))
    const cloudFileRefsMap = new Map((cloudFileRefs.d as FileRef[]).map(ref => [`${ref.hash}-${ref.refid}`, ref]))

    // 同步操作计数
    let uploadCount = 0
    let downloadCount = 0
    let deleteCount = 0

    // 2. 合并本地引用表和云端引用表
    // 处理本地引用
    for (const localRef of localFileRefs) {
      const key = `${localRef.hash}-${localRef.refid}`
      const cloudRef = cloudFileRefsMap.get(key) as FileRef | undefined

      // 处理已删除的引用
      if (localRef.isdeleted === 1) {
        // 如果云端不存在此引用，需要上传
        if (!cloudRef) {
          const id = await addCloudFileRef(localRef)
          localRef.id = Number.parseInt(id as string)
          await updateFileRef(localRef)
          uploadCount++
        }
        // 如果云端存在此引用，比较lastdotime
        else if (localRef.lastdotime > cloudRef.lastdotime) {
          await updateCloudFileRef(localRef)
          uploadCount++
        }
        continue
      }

      // 处理未删除的引用
      if (!cloudRef) {
        // 本地存在但云端不存在，上传到云端
        await addCloudFileRef(localRef)
        uploadCount++
      }
      else {
        // 本地和云端都存在，比较lastdotime
        if (localRef.lastdotime > cloudRef.lastdotime) {
          // 本地版本更新，上传到云端
          await updateCloudFileRef({ ...localRef, id: cloudRef.id })
          uploadCount++
        }
        else if (localRef.lastdotime < cloudRef.lastdotime) {
          // 云端版本更新，更新本地
          await updateFileRef(cloudRef)
          downloadCount++
        }
      }
    }

    // 处理云端引用
    for (const cloudRef of cloudFileRefs.d as FileRef[]) {
      const key = `${cloudRef.hash}-${cloudRef.refid}`
      const localRef = localFileRefsMap.get(key)

      // 如果本地不存在此引用，下载到本地
      if (!localRef) {
        await updateFileRef(cloudRef)
        downloadCount++
      }
    }

    // 3. 检查是否有引用为0的文件，如果为0则标记删除
    // 获取所有本地文件引用的hash列表
    const uniqueHashes = new Set([...localFileRefs.map(ref => ref.hash)])
    const thirtyDaysAgo = getTime() - (30 * 24 * 60 * 60) // 30天前的时间戳

    for (const hash of uniqueHashes) {
      const refCount = await getRefCount(hash)

      // 如果引用计数为0，检查文件是否存在，如果存在则标记为删除
      if (refCount === 0) {
        const file = await getFileByHash(hash)
        if (file) {
          // TypedFile现在lastdotime是必需属性
          const _now = getTime()
          const fileLastdotime = file.lastdotime

          if (!file.isdeleted || fileLastdotime > thirtyDaysAgo) {
            // 标记为删除状态，但不实际删除
            // 注意: 这里需要实现file表的更新方法
            await updateFile({ ...file, isdeleted: 1, lastdotime: _now })
          }
          else if (file.isdeleted && fileLastdotime <= thirtyDaysAgo) {
            // 如果已经是删除状态且超过30天，则真正删除文件
            await deleteFile(hash)
            await deleteCloudFile(file.id!)
            deleteCount++
          }
        }
      }
    }

    // 更新lastdotime
    fileRefLastdotime.value = getTime()
    localStorage.fileRefLastdotime = JSON.stringify(fileRefLastdotime.value)

    console.warn('文件引用同步完成', {
      uploaded: uploadCount,
      downloaded: downloadCount,
      deleted: deleteCount,
    })
  }

  // 上传本地保存的附件
  async function syncFile() {
    const { updateFile, getLocalFiles } = useFiles()
    const { getFilesRefByHash } = useFileRefs()
    return new Promise((resolve, reject) => {
      getLocalFiles().then(async (localFiles) => {
        try {
          for (const file of localFiles || []) {
            file.id = await addCloudFile(file)
            const cloudFile = await getCloudFile(file.id!)
            file.url = cloudFile.d.url
            await updateFile(file)
            // 先获取引用表的相关引用，再更新备忘中的hash
            const fileRefs = await getFilesRefByHash(file.hash!)
            for (const ref of fileRefs || []) {
              // 获取备忘录，更新newstext
              const note = await getNote(ref.refid)
              if (note) {
                const newNote = { ...note, newstext: note.newstext.replace(new RegExp(`${file.hash}`, 'g'), file.url!), lastdotime: getTime() }
                await updateNote(note.uuid, newNote)
                await updateCloudNote(newNote)
              }
            }
          }
        }
        catch (error) {
          console.error('上传本地保存的附件失败', error)
          reject(error)
        }
        finally {
          resolve(true)
        }
      })
    })
  }

  return {
    sync,
    syncing,
    onSynced,
    offOnSynced,
  }
}
