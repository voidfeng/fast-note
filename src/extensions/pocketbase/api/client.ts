import type { AuthResponse, UserInfo } from '../types'
import PocketBase from 'pocketbase'

// PocketBase 配置
const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090'

// 创建 PocketBase 客户端实例
export const pb = new PocketBase(pocketbaseUrl)

window.pb = pb

// 用户信息转换函数
function transformUser(record: any): UserInfo {
  return {
    id: record.id,
    email: record.email,
    name: record.name || '',
    username: record.username || '',
    avatar: record.avatar ? pb.files.getUrl(record, record.avatar) : '',
    created: record.created,
    updated: record.updated,
  }
}

// 错误消息映射
function mapErrorMessage(error: any): string {
  const errorMessage = error?.message || error?.toString() || '未知错误'

  const errorMap: Record<string, string> = {
    'Failed to authenticate.': '邮箱或密码错误',
    'The request requires valid authentication.': '需要有效的身份认证',
    'Record not found.': '用户不存在',
    'Network Error': '网络连接错误',
    'Failed to fetch': '网络连接失败',
    'Something went wrong while processing your request.': '请求处理失败',
    'You are not allowed to perform this request.': '没有权限执行此操作',
  }

  return errorMap[errorMessage] || errorMessage
}

// 认证 API
export const authApi = {
  // 用户登录
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password)

      return {
        success: true,
        user: transformUser(authData.record),
        token: authData.token,
      }
    }
    catch (error: any) {
      console.error('PocketBase 登录错误:', error)
      return {
        success: false,
        error: mapErrorMessage(error),
      }
    }
  },

  // 用户登出
  async signOut(): Promise<AuthResponse> {
    try {
      pb.authStore.clear()
      return {
        success: true,
      }
    }
    catch (error: any) {
      console.error('PocketBase 登出错误:', error)
      return {
        success: false,
        error: mapErrorMessage(error),
      }
    }
  },

  // 获取当前用户
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      // 检查是否有有效的认证
      if (!pb.authStore.isValid) {
        return {
          success: false,
          error: '未找到有效的认证信息',
        }
      }

      // 刷新认证信息（这会验证当前token是否有效）
      const authData = await pb.collection('users').authRefresh()

      return {
        success: true,
        user: transformUser(authData.record),
        token: authData.token,
      }
    }
    catch (error: any) {
      console.error('获取当前用户错误:', error)
      // 如果认证失败，清除无效的认证信息
      pb.authStore.clear()
      return {
        success: false,
        error: mapErrorMessage(error),
      }
    }
  },

  // 检查是否已认证
  isAuthenticated(): boolean {
    return pb.authStore.isValid
  },

  // 获取认证令牌
  getToken(): string | null {
    return pb.authStore.token || null
  },

  // 获取当前认证用户（不发起网络请求）
  getCurrentAuthUser(): UserInfo | null {
    if (!pb.authStore.isValid || !pb.authStore.model) {
      return null
    }
    return transformUser(pb.authStore.model)
  },

  // 监听认证状态变化
  onAuthChange(callback: (token: string, model: any) => void): () => void {
    return pb.authStore.onChange(callback)
  },
}

// Notes API
export const notesApi = {
  // 获取指定lastdotime之后的所有笔记变更
  async getNotesByLastdotime(lastdotime: string): Promise<{ d: any[] }> {
    try {
      if (!pb.authStore.isValid) {
        throw new Error('用户未登录')
      }

      const records = await pb.collection('notes').getFullList({
        filter: `updated > "${lastdotime}" && userid = "${pb.authStore.model?.id}"`,
        sort: '+updated',
      })

      return { d: records || [] }
    }
    catch (error: any) {
      console.error('获取PocketBase笔记失败:', error)
      throw new Error(`获取PocketBase笔记失败: ${mapErrorMessage(error)}`)
    }
  },

  // 添加新笔记
  async addNote(note: any): Promise<string> {
    try {
      const record = await pb.collection('notes').create({
        ...note,
        user_id: pb.authStore.model?.id,
      })

      return record.uuid
    }
    catch (error: any) {
      console.error('添加PocketBase笔记失败:', error)
      throw new Error(`添加PocketBase笔记失败: ${mapErrorMessage(error)}`)
    }
  },

  // 更新笔记（upsert 操作）
  async updateNote(note: any): Promise<boolean> {
    try {
      // 先尝试查找是否存在
      const existingRecords = await pb.collection('notes').getFullList({
        filter: `uuid = "${note.uuid}" && user_id = "${pb.authStore.model?.id}"`,
      })

      if (existingRecords.length > 0) {
        // 更新现有记录
        await pb.collection('notes').update(existingRecords[0].id, {
          ...note,
          user_id: pb.authStore.model?.id,
        })
      }
      else {
        // 创建新记录
        await pb.collection('notes').create({
          ...note,
          user_id: pb.authStore.model?.id,
        })
      }

      return true
    }
    catch (error: any) {
      console.error('更新PocketBase笔记失败:', error)
      throw new Error(`更新PocketBase笔记失败: ${mapErrorMessage(error)}`)
    }
  },
}

// 默认导出PocketBase实例，供其他模块使用
export default pb
