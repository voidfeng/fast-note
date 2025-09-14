# PocketBase 用户认证扩展

这个扩展提供了基于 PocketBase 官方 SDK 的用户认证功能，专注于简洁的登录体验。

## 功能特性

### 用户登录

- 邮箱密码登录
- 基于官方 PocketBase SDK，功能更可靠
- 自动令牌管理和刷新
- 登录状态持久化
- 实时认证状态监听
- 用户信息获取和管理
- 自动处理头像文件URL

## 组件说明

### LoginPage.vue

简洁的登录页面组件，使用 UnoCSS 原子化样式。

#### 特性

- 响应式设计，适配桌面端和移动端
- 表单验证和错误提示
- 加载状态提示
- 支持键盘回车登录
- 深色模式支持

#### 使用方法

```vue
<script setup>
import { LoginPage } from '@/extensions/pocketbase'
</script>

<template>
  <LoginPage />
</template>
```

## API 说明

### useAuth Hook

用户认证管理 Hook，提供完整的登录状态管理功能。

#### 功能特性

- 基于官方 PocketBase SDK 的可靠认证
- 响应式登录状态管理
- 自动令牌存储、刷新和恢复
- 实时认证状态变化监听
- 用户信息获取和刷新
- 登录/登出功能
- 认证状态初始化
- 文件URL自动处理

#### 使用方法

```typescript
import { useAuth } from '@/extensions/pocketbase'

const {
  userInfo, // 用户信息
  isLoggedIn, // 是否已登录
  isLoading, // 加载状态
  currentUser, // 当前用户对象
  login, // 登录方法
  logout, // 登出方法
  refreshUser, // 刷新用户信息
  getToken, // 获取令牌
  isAuthenticated, // 检查认证状态
} = useAuth()
```

#### 主要方法

##### login(email: string, password: string)

用户登录

```typescript
const result = await login('user@example.com', 'password')
if (result.success) {
  console.log('登录成功:', result.user)
}
else {
  console.error('登录失败:', result.error)
}
```

##### logout()

用户登出

```typescript
const result = await logout()
if (result.success) {
  console.log('登出成功')
}
else {
  console.error('登出失败:', result.error)
}
```

##### refreshUser()

刷新用户信息

```typescript
const result = await refreshUser()
if (result.success) {
  console.log('用户信息已更新:', result.user)
}
else {
  console.error('刷新失败:', result.error)
}
```

#### 状态属性

- `userInfo` - 用户信息对象（包含 id、email、name 等）
- `isLoggedIn` - 是否已登录（布尔值）
- `isLoading` - 是否正在加载（布尔值）
- `currentUser` - 当前用户对象

#### 认证机制

- 使用 PocketBase 官方 SDK 的 AuthStore
- 自动保存令牌到 localStorage（持久化）
- 自动令牌刷新和验证
- 实时认证状态变化监听
- 登录后自动从本地缓存加载，然后从服务器验证
- 登出时自动清除所有认证信息
- 认证失败时自动清除无效令牌

### 客户端 API

#### authApi

基于官方 PocketBase SDK 提供底层的认证 API 方法：

```typescript
import { authApi, pb } from '@/extensions/pocketbase/api/client'

// 登录
const result = await authApi.signIn(email, password)

// 登出
const result = await authApi.signOut()

// 获取当前用户（网络请求）
const result = await authApi.getCurrentUser()

// 获取当前认证用户（本地缓存）
const user = authApi.getCurrentAuthUser()

// 检查认证状态
const isAuth = authApi.isAuthenticated()

// 获取令牌
const token = authApi.getToken()

// 监听认证状态变化
const unsubscribe = authApi.onAuthChange((token, model) => {
  console.log('认证状态改变:', token, model)
})
```

#### PocketBase 实例

直接访问官方 PocketBase 客户端实例：

```typescript
import pb from '@/extensions/pocketbase/api/client'

// 使用官方 API
const records = await pb.collection('posts').getFullList()

// 文件上传
const formData = new FormData()
formData.append('file', file)
const record = await pb.collection('files').create(formData)
```

## 路由配置

扩展自动注册以下路由：

- `/pocketbase/login` - PocketBase 登录页面
- `/auth/pocketbase-login` - 登录页面（别名）

## 环境配置

确保在 `.env` 文件中配置了 PocketBase 相关环境变量：

```env
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

如果未设置，默认使用 `http://127.0.0.1:8090`。

## PocketBase 配置要求

### 1. 用户集合设置

确保 PocketBase 中已创建 `users` 集合，并包含以下字段：

- `email` (email) - 用户邮箱
- `password` (password) - 用户密码
- `name` (text, 可选) - 用户姓名
- `username` (text, 可选) - 用户名
- `avatar` (file, 可选) - 用户头像

### 2. API 规则配置

在 PocketBase Admin 中设置适当的 API 规则：

- **Auth** > **Settings** > 启用邮箱认证
- **Collections** > **users** > 设置适当的访问权限

### 3. CORS 配置

如果前端和 PocketBase 不在同一域，需要配置 CORS：

```bash
pocketbase serve --http=127.0.0.1:8090 --cors
```

## 使用示例

### 完整的登录流程示例

```vue
<script setup>
import { useIonRouter } from '@ionic/vue'
import { onMounted, ref } from 'vue'
import { LoginPage, useAuth } from '@/extensions/pocketbase'

const router = useIonRouter()
const {
  userInfo,
  isLoggedIn,
  login,
  logout
} = useAuth()

// 检查登录状态
onMounted(() => {
  if (isLoggedIn.value) {
    console.log('用户已登录:', userInfo.value)
  }
})

// 手动登录
async function handleLogin() {
  const result = await login('user@example.com', 'password')
  if (result.success) {
    console.log('登录成功，跳转到主页')
    router.push('/')
  }
}

// 登出
async function handleLogout() {
  const result = await logout()
  if (result.success) {
    console.log('已登出')
  }
}
</script>

<template>
  <div>
    <!-- 使用内置的登录页面 -->
    <LoginPage v-if="!isLoggedIn" />

    <!-- 用户已登录的状态 -->
    <div v-else>
      <h2>欢迎，{{ userInfo?.name || userInfo?.email }}！</h2>
      <p>用户 ID: {{ userInfo?.id }}</p>
      <button @click="handleLogout">
        登出
      </button>
    </div>
  </div>
</template>
```

### 在路由守卫中使用

```typescript
// router/index.ts
import { useAuth } from '@/extensions/pocketbase'

router.beforeEach(async (to, from, next) => {
  const { isLoggedIn } = useAuth()

  if (to.meta.requiresAuth && !isLoggedIn.value) {
    next('/pocketbase/login')
  }
  else {
    next()
  }
})
```

## 注意事项

1. **令牌安全**：基于官方 SDK 的 AuthStore，令牌存储在 localStorage 中，在共享设备上使用时请注意安全
2. **网络连接**：确保前端能够访问 PocketBase 服务器
3. **SDK 优势**：使用官方 SDK 提供更可靠的认证、自动令牌刷新、实时状态监听等功能
4. **错误处理**：扩展提供了友好的错误提示，基于 SDK 的错误处理更加完善
5. **样式定制**：组件使用 UnoCSS，可以通过修改类名来定制样式
6. **扩展性**：可直接使用官方 SDK 的全部功能，轻松扩展数据操作

## 故障排除

### 登录失败

1. 检查 PocketBase 服务器是否正常运行
2. 确认用户邮箱和密码是否正确
3. 查看浏览器控制台的错误信息
4. 检查网络连接

### 令牌失效

1. 官方 SDK 会自动处理令牌刷新，通常无需手动处理
2. 如果遇到认证问题，SDK 会自动清除无效令牌
3. 如需重置，可调用 `logout()` 清除所有认证信息后重新登录

### 样式问题

1. 确保 UnoCSS 已正确配置
2. 检查是否有样式冲突
3. 可以通过自定义 CSS 覆盖默认样式

## 扩展和定制

这个扩展设计为简洁和可扩展的。如果需要添加更多功能：

1. 可以扩展 `types/index.ts` 添加新的类型定义
2. 在 `api/client.ts` 中添加新的 API 方法
3. 扩展 `hooks/useAuth.ts` 添加新的认证功能
4. 创建新的组件来满足特定需求

## 版本要求

- Vue 3.x
- Ionic 8.x
- UnoCSS
- PocketBase SDK 0.26+
- PocketBase 服务器 0.16+
