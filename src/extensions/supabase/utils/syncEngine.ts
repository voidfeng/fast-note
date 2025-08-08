import type { Dexie } from 'dexie'
import type { DataConverter, SyncConfig, SyncHandler, SyncOperations } from '../types/sync'

// 通用同步分析函数
export async function analyzeSyncOperations<T>(
  remoteData: T[],
  localData: T[],
  handler: SyncHandler<T>,
  config?: SyncConfig,
): Promise<SyncOperations<T>> {
  const operations: SyncOperations<T> = {
    toUpdate: [],
    toInsert: [],
    toUpload: [],
    toDelete: [],
    toHardDelete: [],
  }

  // 创建映射表便于查找
  const localMap = new Map(localData.map(item => [handler.getKey(item), item]))
  const remoteMap = new Map(remoteData.map(item => [handler.getKey(item), item]))

  // 分析远程数据
  for (const remoteItem of remoteData) {
    const key = handler.getKey(remoteItem)
    const localItem = localMap.get(key)

    if (!localItem) {
      // 本地没有，需要插入
      operations.toInsert.push(remoteItem)
    }
    else {
      // 比较时间戳，最后写入获胜策略
      const remoteTime = handler.getTimestamp(remoteItem)
      const localTime = handler.getTimestamp(localItem)

      if (remoteTime > localTime) {
        // 远程更新，需要更新本地
        operations.toUpdate.push(remoteItem)
      }
    }
  }

  // 分析本地数据
  for (const localItem of localData) {
    const key = handler.getKey(localItem)
    const remoteItem = remoteMap.get(key)

    if (!remoteItem) {
      // 远程没有，需要上传
      operations.toUpload.push(localItem)
    }
    else {
      // 比较时间戳
      const remoteTime = handler.getTimestamp(remoteItem)
      const localTime = handler.getTimestamp(localItem)

      if (localTime > remoteTime) {
        // 本地更新，需要上传
        operations.toUpload.push(localItem)
      }
    }
  }

  // 检查需要硬删除的数据（超过宽限期的软删除数据）
  if (config && handler.isDeleted) {
    const now = Date.now()
    const allItems = [...remoteData, ...localData]

    for (const item of allItems) {
      if (handler.isDeleted(item)) {
        const deletionTime = handler.getTimestamp(item)
        if (now - deletionTime > config.deletionGracePeriod) {
          operations.toHardDelete.push(item)
        }
      }
    }
  }

  return operations
}

// 通用执行同步操作函数
export interface ExecuteSyncOptions<T> {
  sortFn?: (data: any[]) => any[]
  getDeleteId?: (item: T) => any
  tableName?: string
}

export async function executeSyncOperations<T>(
  operations: SyncOperations<T>,
  table: Dexie.Table<T, any>,
  converter: DataConverter<T, any>,
  uploadFn: (data: any[]) => Promise<boolean>,
  deleteFn?: (ids: any[]) => Promise<boolean>,
  options?: ExecuteSyncOptions<T>,
): Promise<void> {
  const tableName = options?.tableName || 'data'

  // 1. 更新本地数据
  if (operations.toUpdate.length > 0) {
    const localData = operations.toUpdate.map(item => converter.toLocal(item))
    await table.bulkPut(localData)
  }

  // 2. 插入本地数据
  if (operations.toInsert.length > 0) {
    const localData = operations.toInsert.map(item => converter.toLocal(item))
    await table.bulkAdd(localData)
  }

  // 3. 上传到云端
  if (operations.toUpload.length > 0) {
    const remoteData = operations.toUpload.map(item => converter.toRemote(item))
    const sortedData = options?.sortFn ? options.sortFn(remoteData) : remoteData

    const success = await uploadFn(sortedData)
    if (!success) {
      console.error(`上传 ${operations.toUpload.length} 条${tableName}到云端失败`)
    }
  }

  // 4. 处理硬删除
  if (operations.toHardDelete.length > 0 && deleteFn && options?.getDeleteId) {
    await processHardDelete(
      operations.toHardDelete,
      table,
      deleteFn,
      options.getDeleteId,
      tableName,
    )
  }
}

// 处理硬删除
async function processHardDelete<T>(
  items: T[],
  table: Dexie.Table<T, any>,
  deleteFn: (ids: any[]) => Promise<boolean>,
  getDeleteId: (item: T) => any,
  tableName: string,
): Promise<void> {
  try {
    const ids = items.map(getDeleteId).filter(id => id !== undefined)

    if (ids.length === 0) {
      return
    }

    // 从云端删除
    const cloudDeleteSuccess = await deleteFn(ids)

    // 从本地删除
    const primaryKey = table.schema.primKey.name
    if (primaryKey) {
      await table.where(primaryKey).anyOf(ids).delete()
    }

    if (!cloudDeleteSuccess) {
      console.error(`云端删除${tableName}失败`)
    }
  }
  catch (error) {
    console.error(`硬删除${tableName}失败:`, error)
  }
}

// 获取和保存最后同步时间
export async function getLastSyncTime(): Promise<number> {
  try {
    const stored = localStorage.getItem('supabase_last_sync_time')
    return stored ? Number.parseInt(stored, 10) : 0
  }
  catch {
    return 0
  }
}

export async function saveLastSyncTime(timestamp: number): Promise<void> {
  try {
    localStorage.setItem('supabase_last_sync_time', timestamp.toString())
  }
  catch (error) {
    console.error('保存同步时间失败:', error)
  }
}
