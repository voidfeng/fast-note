# Supabase 用户认证扩展

这个扩展提供了完整的 Supabase 用户认证功能，包括传统的邮箱密码登录和新增的邮箱验证码登录。

## 功能特性

### 1. 传统登录方式

- 邮箱密码登录
- 用户注册
- 密码重置

### 2. 邮箱验证码登录（新增）

- 发送邮箱验证码
- 验证码登录（无需密码）
- 自动创建用户（如果不存在）

## 组件说明

### LoginPage.vue

主要的登录页面组件，支持三种模式：

- **密码登录模式**：传统的邮箱密码登录
- **注册模式**：用户注册功能
- **验证码登录模式**：使用邮箱验证码登录

#### 使用方法

```vue
<script setup>
import { LoginPage } from '@/extensions/supabase'
</script>

<template>
  <LoginPage />
</template>
```

### OTPLoginTest.vue

验证码登录功能的测试页面，用于验证邮箱验证码登录是否正常工作。

#### 访问路径

- `/supabase/otp-test`

### UserProfile.vue

用户信息展示组件。

## API 说明

### useSupabaseAuth Hook

#### 新增方法

##### sendEmailOTP(email: string)

发送邮箱验证码

```typescript
const { sendEmailOTP } = useSupabaseAuth()

const result = await sendEmailOTP('user@example.com')
if (result.success) {
  console.log('验证码发送成功')
}
else {
  console.error('发送失败:', result.error)
}
```

##### loginWithEmailOTP(email: string, token: string)

使用邮箱验证码登录

```typescript
const { loginWithEmailOTP } = useSupabaseAuth()

const result = await loginWithEmailOTP('user@example.com', '123456')
if (result.success) {
  console.log('登录成功:', result.user)
}
else {
  console.error('登录失败:', result.error)
}
```

#### 现有方法

- `login(email, password)` - 邮箱密码登录
- `register(email, password, metadata?)` - 用户注册
- `logout()` - 用户登出
- `resetPassword(email)` - 重置密码

#### 状态

- `userInfo` - 当前用户信息
- `isLoggedIn` - 是否已登录
- `isLoading` - 加载状态
- `currentUser` - 当前用户对象
- `currentSession` - 当前会话

## 路由配置

扩展自动注册以下路由：

- `/supabase/login` - 登录页面
- `/auth/login` - 登录页面（别名）
- `/supabase/otp-test` - 验证码登录测试页面

## 环境配置

确保在 `.env` 文件中配置了 Supabase 相关环境变量：

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Supabase 配置要求

为了使邮箱验证码登录正常工作，需要在 Supabase 控制台进行以下配置：

### 1. 启用邮箱 OTP

在 Supabase 控制台的 Authentication > Settings > Auth Providers 中：

- 确保 Email 提供商已启用
- 启用 "Enable email confirmations"

### 2. 配置邮件模板

在 Authentication > Settings > Email Templates 中：

- 配置 "Magic Link" 模板（用于验证码邮件）
- 自定义邮件内容和样式

### 3. 安全设置

在 Authentication > Settings > Security 中：

- 设置合适的会话超时时间
- 配置密码策略（如果需要）

## 使用示例

### 完整的登录流程示例

```vue
<script setup>
import { ref } from 'vue'
import { LoginPage, useSupabaseAuth } from '@/extensions/supabase'

const {
  userInfo,
  isLoggedIn,
  sendEmailOTP,
  loginWithEmailOTP,
  logout
} = useSupabaseAuth()

const email = ref('')
const otp = ref('')

async function sendOTP() {
  const result = await sendEmailOTP(email.value)
  if (result.success) {
    alert('验证码已发送')
  }
  else {
    alert(`发送失败: ${result.error}`)
  }
}

async function verifyOTP() {
  const result = await loginWithEmailOTP(email.value, otp.value)
  if (result.success) {
    alert('登录成功')
  }
  else {
    alert(`登录失败: ${result.error}`)
  }
}
</script>

<template>
  <div>
    <!-- 使用内置的登录页面 -->
    <LoginPage />

    <!-- 或者自定义登录逻辑 -->
    <div v-if="!isLoggedIn">
      <input v-model="email" placeholder="邮箱">
      <input v-model="otp" placeholder="验证码">
      <button @click="sendOTP">
        发送验证码
      </button>
      <button @click="verifyOTP">
        登录
      </button>
    </div>

    <div v-else>
      <p>欢迎，{{ userInfo?.email }}！</p>
      <button @click="logout">
        登出
      </button>
    </div>
  </div>
</template>
```

## 注意事项

1. **验证码有效期**：Supabase 发送的验证码通常有效期为 5-10 分钟
2. **频率限制**：为防止滥用，Supabase 对验证码发送有频率限制
3. **用户创建**：使用验证码登录时，如果用户不存在会自动创建
4. **邮件配置**：确保 Supabase 项目已正确配置邮件发送服务

## 故障排除

### 验证码收不到

1. 检查邮箱地址是否正确
2. 查看垃圾邮件文件夹
3. 确认 Supabase 邮件配置正确

### 验证码验证失败

1. 确认验证码输入正确
2. 检查验证码是否过期
3. 确认邮箱地址与发送时一致

### 登录后状态异常

1. 检查 Supabase 会话配置
2. 确认认证状态监听器正常工作
3. 查看浏览器控制台错误信息
