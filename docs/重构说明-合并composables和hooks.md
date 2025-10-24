# 合并 composables 和 hooks 目录

## 📋 重构概述

将 `composables/` 和 `hooks/` 两个目录合并为统一的 `hooks/` 目录，消除概念重复。

## 🎯 重构原因

### 问题

1. **概念重复**：在 Vue3 中，composables 和 hooks 都指可组合函数（Composable Functions）
2. **目录冗余**：两个目录存放相同性质的代码，造成困惑
3. **不符合惯例**：虽然 Vue3 官方推荐使用 `composables/`，但实际项目中 `hooks/` 也被广泛接受

### 决策

选择保留 `hooks/` 目录，原因：

- ✅ **改动更小**：hooks/ 已有 13 个文件，composables/ 只有 2 个
- ✅ **语义清晰**：在现代前端开发中，hooks 已成为可组合函数的通用术语
- ✅ **统一管理**：所有可组合函数集中在一个目录

## 📁 目录结构变化

### 重构前

```
src/
├── composables/             ← 2个文件
│   ├── useEditor.ts
│   └── useTheme.ts
│
└── hooks/                   ← 13个文件
    ├── useAuth.ts
    ├── useSync.ts
    ├── useRealtime.ts
    ├── useExtensions.ts
    ├── useUserPublicNotesSync.ts
    ├── useUserCache.ts
    ├── useNavigationHistory.ts
    ├── useSmartBackButton.ts
    ├── useNoteFiles.ts
    ├── useWebAuthn.ts
    ├── useVisualViewport.ts
    ├── useIonicLongPressList.ts
    └── useDeviceType.ts
```

### 重构后

```
src/
└── hooks/                   ← 15个文件（全部合并）
    ├── useAuth.ts          # 认证管理
    ├── useSync.ts          # 数据同步
    ├── useRealtime.ts      # 实时连接
    ├── useEditor.ts        # 编辑器（从 composables/ 迁移）
    ├── useTheme.ts         # 主题管理（从 composables/ 迁移）
    ├── useExtensions.ts
    ├── useUserPublicNotesSync.ts
    ├── useUserCache.ts
    ├── useNavigationHistory.ts
    ├── useSmartBackButton.ts
    ├── useNoteFiles.ts
    ├── useWebAuthn.ts
    ├── useVisualViewport.ts
    ├── useIonicLongPressList.ts
    └── useDeviceType.ts
```

## 🔄 重构内容

### 1. 文件迁移

**迁移的文件：**

- `composables/useEditor.ts` → `hooks/useEditor.ts`
- `composables/useTheme.ts` → `hooks/useTheme.ts`

### 2. 导入路径更新

**更新的文件：**

| 文件                 | 旧路径                    | 新路径              |
| -------------------- | ------------------------- | ------------------- |
| `App.vue`            | `@/composables/useTheme`  | `@/hooks/useTheme`  |
| `YYEditor.vue`       | `@/composables/useEditor` | `@/hooks/useEditor` |
| `DarkModeToggle.vue` | `@/composables/useTheme`  | `@/hooks/useTheme`  |

### 3. 目录清理

- ✅ 删除空的 `composables/` 目录

## 🎁 重构优势

### 1. 概念统一

- ✅ 消除 composables vs hooks 的困惑
- ✅ 所有可组合函数在同一目录
- ✅ 更容易被开发者发现和使用

### 2. 简化结构

- ✅ 减少一层目录嵌套
- ✅ 降低项目复杂度
- ✅ 提高可维护性

### 3. 符合惯例

- ✅ 在实际项目中被广泛使用
- ✅ 与 React 社区术语保持一致
- ✅ 更直观的命名

## 📝 迁移检查清单

- [x] 将 composables/ 文件移动到 hooks/
- [x] 更新 App.vue 的导入路径
- [x] 更新 YYEditor.vue 的导入路径
- [x] 更新 DarkModeToggle.vue 的导入路径
- [x] 删除 composables/ 目录
- [x] 更新相关文档
- [x] 验证无 lint 错误

## 🚀 使用示例

### 编辑器 Hook

```typescript
// 旧方式
import { useEditor } from '@/composables/useEditor'

// 新方式
import { useEditor } from '@/hooks/useEditor'

// 使用
const { editor, initEditor, setContent } = useEditor()
```

### 主题 Hook

```typescript
// 旧方式
import { useTheme } from '@/composables/useTheme'

// 新方式
import { useTheme } from '@/hooks/useTheme'

// 使用
const { currentMode, isDarkMode, setThemeMode } = useTheme()
```

## 💡 最佳实践

### Hooks 命名规范

- ✅ 所有 hooks 以 `use` 开头
- ✅ 使用驼峰命名：`useMyFeature`
- ✅ 名称应清晰描述功能

### Hooks 组织原则

1. **按功能分类**：相关的 hooks 可以用注释分组
2. **单一职责**：每个 hook 专注于一个功能
3. **可复用性**：设计通用的 hooks 供多处使用
4. **文档完善**：复杂的 hooks 应提供详细注释

### 推荐的 Hooks 分类

```
hooks/
├── # 认证相关
│   ├── useAuth.ts
│   └── useWebAuthn.ts
│
├── # 数据管理
│   ├── useSync.ts
│   ├── useRealtime.ts
│   ├── useNoteFiles.ts
│   ├── useUserCache.ts
│   └── useUserPublicNotesSync.ts
│
├── # UI 交互
│   ├── useEditor.ts
│   ├── useTheme.ts
│   ├── useIonicLongPressList.ts
│   └── useVisualViewport.ts
│
├── # 导航相关
│   ├── useNavigationHistory.ts
│   └── useSmartBackButton.ts
│
└── # 工具类
    ├── useDeviceType.ts
    └── useExtensions.ts
```

## ⚠️ 注意事项

1. **向后兼容**：所有导入路径已更新，无需手动修改其他代码

2. **命名一致性**：虽然合并到 `hooks/` 目录，但在注释中仍可称之为 "composables" 或 "可组合函数"

3. **Vue3 官方术语**：Vue3 官方文档使用 "Composables" 术语，但 "Hooks" 在实践中更通用

## 📚 相关文档

- [重构说明 - 取消扩展系统](./重构说明-取消扩展系统.md)
- [项目架构说明](./架构说明.md)
- [开发文档](./开发文档/)

## ✅ 重构完成

所有重构任务已完成，代码已通过 lint 检查，可以正常使用。

---

**重构日期**: 2025-10-24
**重构人员**: AI Assistant
