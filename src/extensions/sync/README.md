# 同步扩展 (Sync Extension)

这个扩展提供了完整的用户认证和数据同步功能，包括用户登录、登出、数据同步等核心功能。

## 功能特性

### 用户认证

- 用户登录/登出
- Cookie 管理
- 用户信息存储
- 登录状态检查

### 数据同步

- 备忘录同步
- 文件引用同步
- 附件同步
- 增量同步支持

## 组件

### LoginPage

用户登录页面组件，提供用户名和密码输入界面。

```vue
<template>
  <LoginPage />
</template>
```

### SyncState

同步状态组件，显示同步按钮和当前同步状态。

```vue
<template>
  <SyncState />
</template>
```

### UserProfile

用户信息组件，显示当前登录用户信息和登出按钮。

```vue
<template>
  <UserProfile />
</template>
```

## Hooks

### useAuth

用户认证相关的 hook，提供登录、登出、用户信息管理等功能。

```typescript
import { useAuth } from '@/extensions/sync/hooks/useAuth'

const {
  userInfo, // 用户信息
  isLoggedIn, // 登录状态
  login, // 登录函数
  userLogout, // 登出函数
  cookieStringForHeader // Cookie 字符串
} = useAuth()
```

### useSync

数据同步相关的 hook，提供同步功能和状态管理。

```typescript
import { useSync } from '@/extensions/sync/hooks/useSync'

const {
  sync, // 同步函数
  syncing, // 同步状态
  onSynced, // 同步完成回调
} = useSync()
```

## API

### syncApi

提供与云端服务器交互的 API 函数。

- `getCloudNodesByLastdotime()` - 获取云端备忘录
- `addCloudNote()` - 添加云端备忘录
- `updateCloudNote()` - 更新云端备忘录
- `getCloudFileRefsByLastdotime()` - 获取云端文件引用
- `addCloudFileRef()` - 添加云端文件引用
- `updateCloudFileRef()` - 更新云端文件引用
- `addCloudFile()` - 添加云端文件
- `getCloudFile()` - 获取云端文件

## 使用方式

### 1. 安装扩展

```typescript
import syncExtension from '@/extensions/sync'

app.use(syncExtension)
```

### 2. 使用组件

```vue
<template>
  <div>
    <!-- 同步状态按钮 -->
    <SyncState />

    <!-- 用户信息 -->
    <UserProfile />
  </div>
</template>
```

### 3. 使用 Hooks

```vue
<script setup lang="ts">
import { useAuth, useSync } from '@/extensions/sync'

const { userInfo, isLoggedIn } = useAuth()
const { sync, syncing } = useSync()

// 手动触发同步
function handleSync() {
  if (isLoggedIn.value) {
    sync()
  }
}
</script>
```

## 向后兼容

为了保持向后兼容性，原有的 `useUserInfo` hook 现在重新导出了 `useAuth` 的功能：

```typescript
import { useAuth } from '@/extensions/sync/hooks/useAuth'
// 这两种方式是等价的
import { useUserInfo } from '@/hooks/useUserInfo'
```

## 文件结构

```
src/extensions/sync/
├── README.md                    # 说明文档
├── index.ts                     # 扩展入口文件
├── api/
│   └── syncApi.ts              # 同步 API
├── components/
│   ├── LoginPage.vue           # 登录页面
│   ├── SyncState.vue           # 同步状态组件
│   └── UserProfile.vue         # 用户信息组件
└── hooks/
    ├── useAuth.ts              # 用户认证 hook
    └── useSync.ts              # 数据同步 hook
```
