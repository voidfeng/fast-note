# 并行文件同步实现说明

## 概述

本文档说明了如何实现附件同步时的并行处理，包括文件上传、元数据更新和文件引用链表的同步。

## 核心设计

### 1. 文件存储路径设计

文件在 Supabase Storage 中的存储路径格式：

```
{userId}/{hash前2位}/{hash第3-4位}/{hash}
```

例如：

- hash: `a1b2c3d4e5f6...`
- 路径: `user123/a1/b2/a1b2c3d4e5f6...`

这种设计的优点：

- 避免单个目录下文件过多
- 基于 hash 的路径保证唯一性
- 便于管理和查找

### 2. 并行处理架构

#### 2.1 文件上传工具 (`fileStorage.ts`)

```typescript
// 单个文件上传
export async function uploadFileToStorage(
  file: File,
  userId: string,
  hash: string
): Promise<{ success: boolean, path?: string, error?: string }>

// 批量文件上传（并行）
export async function uploadFilesToStorage(
  files: TypedFile[],
  userId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, { success: boolean, path?: string, error?: string }>>
```

特点：

- 自动检查文件是否已存在，避免重复上传
- 支持进度回调
- 返回每个文件的上传结果

#### 2.2 数据操作增强 (`useSupabaseData.ts`)

新增了 `uploadAndUpsertFiles` 方法，实现文件上传和元数据更新的原子操作：

```typescript
async function uploadAndUpsertFiles(files: TypedFile[]): Promise<{
  success: boolean
  uploaded: number
  failed: number
  errors: Map<string, string>
}>
```

处理流程：

1. 并行上传所有文件到 Storage
2. 收集成功上传的文件信息
3. 批量更新文件元数据到数据库
4. 返回详细的执行结果

#### 2.3 同步引擎增强 (`syncEngine.ts`)

新增了专门的文件同步执行函数：

```typescript
export async function executeFileSyncOperations<T>(
  operations: SyncOperations<T>,
  table: Dexie.Table<T, any>,
  converter: DataConverter<T, any>,
  uploadFn: (data: any[]) => Promise<boolean>,
  uploadFilesFn: (files: any[]) => Promise<any>,
  deleteFn?: (ids: any[]) => Promise<boolean>,
  options?: ExecuteSyncOptions<T>,
): Promise<void>
```

支持并行执行：

- 本地数据更新
- 本地数据插入
- 文件上传和元数据同步
- 硬删除处理

### 3. 同步流程优化 (`useSupabaseSync.ts`)

#### 3.1 双向同步并行化

```typescript
// 创建并行任务数组
const syncTasks: Promise<void>[] = []

// 1. 笔记同步任务
syncTasks.push(noteSyncTask)

// 2. 文件同步任务（使用专门的文件同步函数）
syncTasks.push(fileSyncTask)

// 3. 文件引用同步任务
syncTasks.push(fileRefSyncTask)

// 等待所有同步任务完成
await Promise.all(syncTasks)
```

#### 3.2 全量上传并行化

```typescript
// 并行上传文件和文件引用
const uploadTasks: Promise<any>[] = []

// 上传文件（包含文件内容和元数据）
if (localFiles.length > 0) {
  uploadTasks.push(uploadAndUpsertFiles(localFiles))
}

// 上传文件引用
if (localFileRefs.length > 0) {
  uploadTasks.push(upsertFileRefs(localFileRefs))
}

// 等待所有上传任务完成
await Promise.all(uploadTasks)
```

## 使用示例

### 1. 测试组件

创建了 `TestFileSync.vue` 组件用于测试并行同步功能：

```vue
<script setup lang="ts">
// 创建测试文件
async function createTestFiles() {
  // 计算文件 hash
  const buffer = await file.arrayBuffer()
  const hashArray = await crypto.subtle.digest('SHA-256', buffer)
  const hashHex = Array.from(new Uint8Array(hashArray))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // 保存到本地数据库
  await db.value.file.bulkAdd(fileRecords)
  await db.value.file_refs.bulkAdd(fileRefs)
}

// 测试双向同步
async function testBidirectionalSync() {
  const success = await bidirectionalSync()
  // 记录结果和耗时
}
</script>
```

### 2. 集成到现有系统

在需要同步文件的地方，直接调用相应的同步方法：

```typescript
import { useSupabaseSync } from '@/extensions/supabase/hooks/useSupabaseSync'

const { bidirectionalSync, syncStatus } = useSupabaseSync()

// 执行同步
await bidirectionalSync()

// 监控同步状态
watch(syncStatus, (status) => {
  console.log(`同步进度: ${status.progress}%`)
  console.log(`当前步骤: ${status.currentStep}`)
})
```

## 性能优化

1. **并行处理**：文件上传、元数据更新、文件引用更新同时进行
2. **去重检查**：上传前检查文件是否已存在，避免重复上传
3. **批量操作**：使用批量 API 减少网络请求
4. **进度反馈**：实时更新同步进度，提升用户体验

## 错误处理

1. **单个文件失败不影响整体**：每个文件独立处理，失败的文件会记录错误信息
2. **详细的错误报告**：返回每个文件的处理结果和错误信息
3. **事务一致性**：文件上传成功后才更新元数据

## 注意事项

1. **外键约束**：文件引用表依赖文件表，必须确保文件先同步
2. **文件大小限制**：需要根据 Supabase Storage 的限制调整
3. **并发数控制**：大量文件时可能需要限制并发上传数量
4. **网络稳定性**：建议添加重试机制处理网络异常
5. **存储配额**：注意 Supabase 的存储配额限制
6. **事务一致性**：文件上传成功后才更新元数据，避免数据不一致

## 数据库表关系

```sql
-- 文件表
CREATE TABLE file (
  hash TEXT PRIMARY KEY,
  url TEXT,
  lastdotime TIMESTAMP,
  isdeleted INTEGER,
  user_id TEXT
);

-- 文件引用表（外键约束）
CREATE TABLE file_refs (
  id SERIAL PRIMARY KEY,
  hash TEXT REFERENCES file(hash),
  refid TEXT,
  lastdotime TIMESTAMP,
  isdeleted INTEGER,
  user_id TEXT
);
```

外键约束确保了数据完整性，但也要求同步时必须按正确的顺序执行。
