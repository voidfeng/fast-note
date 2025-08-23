# useRefDBSync - Vue 3 响应式数据库同步插件

## 概述

`useRefDBSync` 是一个 Vue 3 组合式函数，它能创建一个响应式的 ref 对象，并将其内容自动、高效地单向同步到 IndexedDB 数据表中。

## 核心特性

- ✅ **自动化同步**: 监听 ref 变化，自动同步到 IndexedDB
- ✅ **高性能增量更新**: 使用时间戳 + ID 集合的混合策略，避免深比较
- ✅ **事务性写入**: 所有数据库操作在原子事务中完成
- ✅ **类型安全**: 完整的 TypeScript 支持
- ✅ **逻辑解耦**: 封装所有同步逻辑，保持组件代码简洁
- ✅ **防抖优化**: 可配置的防抖延迟，避免频繁写入
- ✅ **错误处理**: 完善的错误处理和状态反馈

## 工作原理

### 1. 变更追踪 - ISO 时间戳 (lastdotime)

- 数据模型要求每个对象都必须有一个 `lastdotime` 字段（字符串类型）
- 当新增或修改对象时，必须将 `lastdotime` 更新为当前的 ISO 8601 格式时间字符串
- 通过比较时间字符串的字典序，高效找出被修改的数据

### 2. 删除追踪 - ID 集合比较

- 通过比较新旧两个数组的 ID 集合，快速计算出需要删除的数据

### 3. 自动执行器 - watch

- 使用 `watch` 函数深度监听 ref 的所有变化，并触发同步逻辑

## 基本用法

### 1. 定义数据类型

```typescript
interface MyData {
  id: string
  name: string
  value: number
  lastdotime: string // 必需字段
}
```

### 2. 使用 hooks

```typescript
import { ref } from 'vue'
import { useDexie } from '@/hooks/useDexie'
import { useRefDBSync } from '@/hooks/useRefDBSync'

const { db } = useDexie()

// 外部创建响应式数据
const data = ref<MyData[]>([])

const {
  syncStatus,
  getCurrentTime
} = useRefDBSync<MyData>({
  data, // 传入外部创建的响应式数据
  table: db.value.my_table, // 直接传入表实例
  idField: 'id',
  debounceMs: 300
})
```

### 3. 操作数据

```typescript
// 添加数据 - 直接操作数组，自动同步
data.value.push({
  id: crypto.randomUUID(),
  name: '新项目',
  value: 100,
  lastdotime: getCurrentTime()
})

// 更新数据 - 找到项目并更新，自动同步
const item = data.value.find(item => item.id === 'item-id')
if (item) {
  item.name = '更新后的名称'
  item.lastdotime = getCurrentTime()
}

// 删除数据 - 从数组中移除，自动同步
const index = data.value.findIndex(item => item.id === 'item-id')
if (index !== -1) {
  data.value.splice(index, 1)
}
```

## API 参考

### UseRefDBSyncOptions

```typescript
interface UseRefDBSyncOptions<T extends SyncableItem> {
  data: Ref<T[]> // 响应式数据源
  table: Dexie.Table<T, any> // Dexie 表实例
  idField: keyof T // ID 字段名
  debounceMs?: number // 防抖延迟时间（毫秒），默认 300
}
```

### 返回值

```md
{
// 响应式数据
data: Ref<T[]> // 响应式数据数组
syncStatus: Ref<SyncStatus> // 同步状态

// 控制方法
manualSync: () => Promise<void> // 手动触发同步
clearDatabase: () => Promise<void> // 清空数据库表
startAutoSync: () => void // 启动自动同步
stopAutoSync: () => void // 停止自动同步

// 工具方法
getCurrentTime: () => string // 获取当前 ISO 时间戳
}
```

### SyncStatus

```typescript
interface SyncStatus {
  isLoading: boolean // 是否正在同步
  error: string | null // 错误信息
  lastSyncTime: string | null // 最后同步时间
}
```

## 完整示例

### 笔记管理示例

```typescript
// hooks/useNoteSync.ts
import type { Note } from '@/types'
import { useDexie } from './useDexie'
import { useRefDBSync } from './useRefDBSync'

export function useNoteSync() {
  const { db } = useDexie()

  // 外部创建响应式数据
  const notes = ref<Note[]>([])

  const {
    syncStatus,
    manualSync,
    getCurrentTime
  } = useRefDBSync<Note>({
    data: notes, // 传入外部创建的响应式数据
    table: db.value.note, // 直接传入表实例
    idField: 'uuid',
    debounceMs: 500
  })

  function createNote(title: string, content: string) {
    const newNote: Note = {
      uuid: crypto.randomUUID(),
      title,
      newstext: content,
      newstime: getCurrentTime(),
      type: 'note',
      puuid: null,
      version: 1,
      isdeleted: 0,
      islocked: 0,
      subcount: 0,
      lastdotime: getCurrentTime()
    }
    notes.value.push(newNote)
    return newNote
  }

  function editNote(uuid: string, updates: Partial<Note>) {
    const index = notes.value.findIndex(note => note.uuid === uuid)
    if (index !== -1) {
      notes.value[index] = {
        ...notes.value[index],
        ...updates,
        lastdotime: getCurrentTime()
      }
      return notes.value[index]
    }
    return null
  }

  function deleteNote(uuid: string) {
    const index = notes.value.findIndex(note => note.uuid === uuid)
    if (index !== -1) {
      return notes.value.splice(index, 1)[0]
    }
    return null
  }

  return {
    notes,
    syncStatus,
    createNote,
    editNote,
    deleteNote,
    manualSync
  }
}
```

### 在组件中使用

```vue
<script setup lang="ts">
import { useNoteSync } from '@/hooks/useNoteSync'

const {
  notes,
  syncStatus,
  createNote,
  editNote,
  deleteNote,
  manualSync
} = useNoteSync()
</script>

<template>
  <div>
    <!-- 同步状态显示 -->
    <div v-if="syncStatus.isLoading" class="loading">
      同步中...
    </div>
    <div v-if="syncStatus.error" class="error">
      {{ syncStatus.error }}
    </div>

    <!-- 操作按钮 -->
    <button @click="createNote('新笔记', '笔记内容')">
      添加笔记
    </button>
    <button @click="manualSync">
      手动同步
    </button>

    <!-- 笔记列表 -->
    <div v-for="note in notes" :key="note.uuid" class="note-item">
      <h3>{{ note.title }}</h3>
      <p>{{ note.newstext }}</p>
      <div class="actions">
        <button @click="editNote(note.uuid, { title: '修改后的标题' })">
          编辑
        </button>
        <button @click="deleteNote(note.uuid)">
          删除
        </button>
      </div>
    </div>
  </div>
</template>
```

## 最佳实践

### 1. 数据模型设计

- 确保每个数据对象都有 `lastdotime` 字段
- 使用有意义的 ID 字段（如 UUID）
- 避免在 `lastdotime` 字段上建立索引（会频繁更新）

### 2. 性能优化

- 合理设置 `debounceMs` 值，避免过于频繁的数据库写入
- 对于大量数据，考虑分页或虚拟滚动
- 使用 `stopAutoSync()` 在组件卸载时停止监听

### 3. 错误处理

- 监听 `syncStatus.error` 并向用户显示错误信息
- 在网络不稳定时使用 `manualSync()` 手动重试

### 4. 数据一致性

- 在修改数据时，记得更新 `lastdotime` 字段为当前时间戳
- 在批量操作时考虑暂停自动同步，完成后手动同步

## 注意事项

1. **数据结构要求**: 所有数据对象必须包含 `lastdotime` 字段
2. **ID 字段唯一性**: 确保 ID 字段在表中是唯一的
3. **内存使用**: 大量数据时注意内存占用，考虑分页加载
4. **浏览器兼容性**: 依赖 IndexedDB，需要现代浏览器支持
5. **数据库版本**: 如果使用自定义数据库实例，确保表结构正确

## 故障排除

### 常见问题

1. **数据不同步**

   - 检查 `lastdotime` 字段是否正确设置
   - 确认 `idField` 配置正确
   - 查看 `syncStatus.error` 获取错误信息

2. **性能问题**

   - 增加 `debounceMs` 值减少写入频率
   - 检查数据量是否过大
   - 考虑使用 `stopAutoSync()` 暂停同步

3. **类型错误**
   - 确保数据类型继承自 `SyncableItem`
   - 检查 `idField` 类型是否正确

### 调试技巧

```text
{
  // 同步状态
  syncStatus: Ref<SyncStatus>       // 同步状态

  // 控制方法
  manualSync: () => Promise<void>   // 手动触发同步
  clearDatabase: () => Promise<void> // 清空数据库表
  startAutoSync: () => void         // 启动自动同步
  stopAutoSync: () => void          // 停止自动同步

  // 工具方法
  getCurrentTime: () => string      // 获取当前 ISO 时间戳
}
```
