# Supabase 用户认证扩展 (Supabase Auth Extension)

这个扩展提供了完整的基于 Supabase 的用户认证功能，包括用户登录、注册、登出、密码重置等核心功能。

## 功能特性

### 用户认证

- 用户登录/注册
- 用户登出
- 密码重置
- 用户信息管理
- 认证状态监听
- 会话管理

### 安全特性

- 基于 Supabase 的安全认证
- JWT Token 管理
- 自动会话刷新
- 安全的密码处理

## 组件

### LoginPage

用户登录/注册页面组件，提供统一的认证界面。

```vue
<template>
  <LoginPage />
</template>
```

特性：

- 登录/注册模式切换
- 表单验证
- 错误处理
- 密码重置功能
- 响应式设计

### UserProfile

用户信息组件，显示当前登录用户信息和管理功能。

```vue
<template>
  <UserProfile />
</template>
```

特性：

- 用户信息展示
- 头像显示
- 登出功能
- 用户详细信息

## Hooks

### useSupabaseAuth

Supabase 用户认证相关的 hook，提供完整的认证功能。

```typescript
import { useSupabaseAuth } from '@/extensions/supabase/hooks/useSupabaseAuth'

const {
  userInfo, // 用户信息
  isLoggedIn, // 登录状态
  isLoading, // 加载状态
  currentUser, // 当前用户对象
  currentSession, // 当前会话
  login, // 登录函数
  register, // 注册函数
  logout, // 登出函数
  resetPassword, // 重置密码函数
  initializeAuth, // 初始化认证状态
} = useSupabaseAuth()
```

#### 方法说明

- `login(email, password)` - 用户登录
- `register(email, password, metadata?)` - 用户注册
- `logout()` - 用户登出
- `resetPassword(email)` - 重置密码
- `initializeAuth()` - 初始化认证状态

#### 状态说明

- `userInfo` - 格式化的用户信息对象
- `isLoggedIn` - 是否已登录
- `isLoading` - 是否正在加载
- `currentUser` - Supabase 用户对象
- `currentSession` - Supabase 会话对象

## API

### supabaseClient

提供与 Supabase 服务交互的客户端和 API 函数。

```typescript
import { authApi, supabase } from '@/extensions/supabase/api/supabaseClient'
```

#### authApi 方法

- `signIn(email, password)` - 用户登录
- `signUp(email, password, metadata?)` - 用户注册
- `signOut()` - 用户登出
- `getCurrentUser()` - 获取当前用户
- `resetPassword(email)` - 重置密码
- `onAuthStateChange(callback)` - 监听认证状态变化

## 环境配置

在项目根目录的 `.env` 文件中配置 Supabase 相关环境变量：

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 使用方式

### 1. 安装依赖

```bash
npm install @supabase/supabase-js
```

### 2. 安装扩展

```typescript
import supabaseExtension from '@/extensions/supabase'

app.use(supabaseExtension)
```

### 3. 使用组件

```vue
<template>
  <div>
    <!-- 用户信息组件 -->
    <SupabaseUserProfile />

    <!-- 或者使用路由跳转到登录页面 -->
    <router-link to="/supabase/login">
      登录
    </router-link>
  </div>
</template>
```

### 4. 使用 Hooks

```vue
<script setup lang="ts">
import { useSupabaseAuth } from '@/extensions/supabase'

const { userInfo, isLoggedIn, login, logout } = useSupabaseAuth()

// 检查登录状态
if (isLoggedIn.value) {
  console.log('用户已登录:', userInfo.value)
}
else {
  console.log('用户未登录')
}

// 手动登录
async function handleLogin() {
  const result = await login('user@example.com', 'password')
  if (result.success) {
    console.log('登录成功')
  }
  else {
    console.error('登录失败:', result.error)
  }
}
</script>
```

### 5. 路由保护

```typescript
import { useSupabaseAuth } from '@/extensions/supabase'

// 在路由守卫中使用
router.beforeEach((to, from, next) => {
  const { isLoggedIn } = useSupabaseAuth()

  if (to.meta.requiresAuth && !isLoggedIn.value) {
    next('/supabase/login')
  }
  else {
    next()
  }
})
```

## 路由

扩展自动注册以下路由：

- `/supabase/login` - 登录页面
- `/auth/login` - 登录页面别名

## 文件结构

```
src/extensions/supabase/
├── README.md                    # 说明文档
├── index.ts                     # 扩展入口文件
├── api/
│   └── supabaseClient.ts       # Supabase 客户端和 API
├── components/
│   ├── LoginPage.vue           # 登录/注册页面
│   └── UserProfile.vue         # 用户信息组件
└── hooks/
    └── useSupabaseAuth.ts      # 用户认证 hook
```

## 注意事项

1. 确保在使用前正确配置 Supabase 环境变量
2. 在 Supabase 控制台中正确配置认证设置
3. 根据需要配置邮件模板和重定向 URL
4. 考虑实现适当的错误处理和用户反馈
5. 在生产环境中确保使用 HTTPS

## 扩展功能

可以根据需要扩展以下功能：

- 社交登录（Google、GitHub 等）
- 多因素认证
- 用户角色和权限管理
- 用户资料编辑
- 邮箱验证
- 手机号验证
