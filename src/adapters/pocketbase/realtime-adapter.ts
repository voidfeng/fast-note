/**
 * PocketBase Realtime 服务适配器
 * 实现 IRealtimeService 接口
 */

import type { RecordSubscription, UnsubscribeFunc } from 'pocketbase'
import type { IRealtimeService, RealtimeConfig } from '@/core/realtime-types'
import type { Note } from '@/types'
import { RealtimeStatus } from '@/core/realtime-types'
import { pb } from '@/pocketbase'
import { useNote } from '@/stores'

export class PocketBaseRealtimeAdapter implements IRealtimeService {
  private unsubscribe: UnsubscribeFunc | null = null
  private status: RealtimeStatus = RealtimeStatus.DISCONNECTED
  private config: RealtimeConfig
  private reconnectTimer: number | null = null
  private reconnectAttempts = 0

  constructor(config: RealtimeConfig = {}) {
    this.config = {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 2000,
      ...config,
    }
  }

  /**
   * 连接到 PocketBase Realtime
   */
  async connect(): Promise<void> {
    // 检查是否已连接
    if (this.status === RealtimeStatus.CONNECTED) {
      console.warn('PocketBase Realtime 已经连接')
      return
    }

    // 检查用户是否已登录
    if (!pb.authStore.isValid || !pb.authStore.model) {
      throw new Error('用户未登录，无法建立 Realtime 连接')
    }

    try {
      this.setStatus(RealtimeStatus.CONNECTING)

      // 订阅 notes 集合的变更
      const userId = pb.authStore.model.id

      this.unsubscribe = await pb.collection('notes').subscribe(
        '*',
        this.handleRealtimeMessage.bind(this),
        {
          filter: `user_id = "${userId}"`,
        },
      )

      this.setStatus(RealtimeStatus.CONNECTED)
      this.reconnectAttempts = 0

      console.log('✅ PocketBase Realtime 连接成功')
    }
    catch (error) {
      console.error('❌ PocketBase Realtime 连接失败:', error)
      this.setStatus(RealtimeStatus.ERROR)

      if (this.config.onError) {
        this.config.onError(error as Error)
      }

      // 尝试重连
      if (this.config.autoReconnect) {
        this.scheduleReconnect()
      }

      throw error
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }

    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.setStatus(RealtimeStatus.DISCONNECTED)
    console.log('🔌 PocketBase Realtime 已断开连接')
  }

  /**
   * 获取当前连接状态
   */
  getStatus(): RealtimeStatus {
    return this.status
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.status === RealtimeStatus.CONNECTED
  }

  /**
   * 处理 Realtime 消息
   */
  private async handleRealtimeMessage(data: RecordSubscription<any>): Promise<void> {
    try {
      console.log('📨 收到 PocketBase Realtime 消息:', data.action, data.record.id)

      const { updateNote, addNote, deleteNote, getNote } = useNote()
      const record = data.record as Note

      // 处理不同的动作
      switch (data.action) {
        case 'create': {
          const existingNote = await getNote(record.id)
          if (!existingNote) {
            await addNote(record)
            console.log('➕ 从云端创建笔记:', record.id)
          }
          break
        }

        case 'update': {
          const localNote = await getNote(record.id)
          if (localNote) {
            const localTime = new Date(localNote.updated).getTime()
            const remoteTime = new Date(record.updated).getTime()

            if (remoteTime > localTime) {
              await updateNote(record.id, record)
              console.log('♻️  从云端更新笔记:', record.id)
            }
            else {
              console.log('⏭️  本地笔记更新，跳过云端推送:', record.id)
            }
          }
          else {
            await addNote(record)
            console.log('➕ 从云端添加笔记:', record.id)
          }
          break
        }

        case 'delete': {
          await deleteNote(record.id)
          console.log('🗑️  从云端删除笔记:', record.id)
          break
        }
      }

      // 触发消息回调
      if (this.config.onMessage) {
        const allowedActions = ['create', 'update', 'delete'] as const
        const action = allowedActions.includes(data.action as any)
          ? (data.action as 'create' | 'update' | 'delete')
          : 'update'

        this.config.onMessage({
          action,
          record,
        })
      }
    }
    catch (error) {
      console.error('处理 Realtime 消息失败:', error)
      if (this.config.onError) {
        this.config.onError(error as Error)
      }
    }
  }

  /**
   * 设置连接状态
   */
  private setStatus(status: RealtimeStatus): void {
    this.status = status

    if (this.config.onStatusChange) {
      this.config.onStatusChange(status)
    }
  }

  /**
   * 计划重连
   */
  private scheduleReconnect(): void {
    const maxAttempts = this.config.maxReconnectAttempts || 5
    const baseDelay = this.config.reconnectDelay || 2000

    // 检查是否超过最大重连次数
    if (this.reconnectAttempts >= maxAttempts) {
      console.error('⛔ 达到最大重连次数，停止重连')
      this.setStatus(RealtimeStatus.ERROR)
      return
    }

    // 清除之前的定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    this.setStatus(RealtimeStatus.RECONNECTING)

    // 计算延迟时间（指数退避）
    const delay = baseDelay * 2 ** (this.reconnectAttempts - 1)

    console.log(`🔄 将在 ${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连`)

    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch((error) => {
        console.error('重连失败:', error)
      })
    }, delay)
  }
}
