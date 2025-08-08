# Supabase 同步模块重构说明

## 重构概述

原始的 `useSupabaseSync.ts` 文件包含了 934 行代码，负责处理三个表（notes、files、file_refs）的数据同步。通过本次重构，我们将其拆分为多个模块，提高了代码的可维护性和可扩展性。

## 文件结构

重构后的文件结构如下：

```
src/extensions/supabase/
├── hooks/
│   └── useSupabaseSync.ts (360行，减少了 574 行)
├── types/
│   └── sync.ts (47行，新增)
├── utils/
│   ├── converters.ts (4行，用于存放数据转换器)
│   ├── noteHelpers.ts (31行，新增)
│   ├── syncEngine.ts (180行，新增)
│   └── index.ts (4行，新增)
└── docs/
    └── sync-refactoring.md (本文档)
```

## 主要改进

### 1. 类型定义分离 (`types/sync.ts`)

- 将所有接口和类型定义抽取到独立文件
- 引入泛型接口 `SyncOperations<T>` 支持不同数据类型
- 定义了 `DataConverter` 和 `SyncHandler` 接口，提供统一的数据处理规范

### 2. 数据转换逻辑分离 (`utils/converters.ts`)

- 用于存放数据转换器
- 目前文件数据无需转换，因此暂时为空

### 3. 笔记工具函数 (`utils/noteHelpers.ts`)

- 包含 `sortNotesByHierarchy` 函数，用于按层级排序笔记
- 确保父笔记在子笔记之前被处理

### 4. 通用同步引擎 (`utils/syncEngine.ts`)

- 实现了通用的同步分析函数 `analyzeSyncOperations`
- 实现了通用的同步执行函数 `executeSyncOperations`
- 将时间戳管理功能独立出来
- 统一了硬删除处理逻辑

### 5. 主 Hook 简化 (`hooks/useSupabaseSync.ts`)

- 从 934 行减少到 360 行（减少了 61.5%）
- 使用通用函数替代重复代码
- 通过 `SyncHandler` 配置不同数据类型的处理方式
- 保持了原有的所有功能和 API 接口

## 优势

1. **可维护性提升**

   - 代码结构更清晰，职责分离
   - 减少了重复代码
   - 更容易定位和修改特定功能

2. **可扩展性增强**

   - 添加新的数据类型同步只需要：
     - 定义新的转换器
     - 定义新的处理器
     - 调用通用同步函数
   - 不需要复制粘贴大量相似代码

3. **类型安全**

   - 使用 TypeScript 泛型确保类型安全
   - 统一的接口定义减少了类型错误

4. **测试友好**
   - 独立的模块更容易进行单元测试
   - 通用函数可以独立测试

## 使用示例

```typescript
// 定义新的数据类型同步
const customHandler: SyncHandler<CustomType> = {
  getKey: item => item.id,
  getTimestamp: item => new Date(item.updatedAt).getTime(),
  isDeleted: item => item.deleted === true,
}

const customConverter: DataConverter<CustomType, RemoteCustomType> = {
  toLocal: remote => ({ /* 转换逻辑 */ }),
  toRemote: local => ({ /* 转换逻辑 */ }),
}

// 使用通用同步函数
const operations = await analyzeSyncOperations(
  remoteData,
  localData,
  customHandler,
  syncConfig
)

await executeSyncOperations(
  operations,
  db.customTable,
  customConverter,
  uploadFunction,
  deleteFunction,
  { tableName: '自定义数据' }
)
```

## 注意事项

1. 保持了原有的所有公开 API，不会影响现有代码的使用
2. 所有的 console.log 已替换为 console.warn 或 console.error 以符合 ESLint 规则
3. 修复了所有 TypeScript 类型错误
4. 保留了原有的所有功能，包括增量同步、全量同步、智能同步等

## 后续优化建议

1. 考虑添加单元测试
2. 可以进一步优化错误处理机制
3. 考虑添加同步冲突解决策略配置
4. 可以添加同步进度的更详细反馈
