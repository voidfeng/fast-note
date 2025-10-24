/**
 * 实时连接管理器
 * 全局单例，管理应用的实时连接状态
 */

import type { IRealtimeService, RealtimeConfig, RealtimeStatus } from './realtime-types'
import { computed, ref } from 'vue'
import { RealtimeStatus as Status } from './realtime-types'

class RealtimeManager {
  private realtimeService: IRealtimeService | null = null
  private status = ref<RealtimeStatus>(Status.DISCONNECTED)
  private lastError = ref<Error | null>(null)

  /**
   * 计算属性
   */
  readonly isConnected = computed(() => this.status.value === Status.CONNECTED)
  readonly isConnecting = computed(() =>
    this.status.value === Status.CONNECTING
    || this.status.value === Status.RECONNECTING,
  )

  readonly hasError = computed(() => this.status.value === Status.ERROR)
  readonly connectionStatus = computed(() => this.status.value)

  /**
   * 设置 Realtime 服务实现
   */
  setRealtimeService(service: IRealtimeService, config?: RealtimeConfig) {
    if (this.realtimeService) {
      console.warn('Realtime 服务已经设置，将被覆盖')
      this.cleanup()
    }

    this.realtimeService = service

    // 设置状态回调
    if (config?.onStatusChange) {
      // 这里需要服务实现支持状态监听
      // 暂时通过轮询状态来更新
      this.setupStatusMonitor()
    }
  }

  /**
   * 获取 Realtime 服务
   */
  getRealtimeService(): IRealtimeService {
    if (!this.realtimeService) {
      throw new Error('Realtime 服务未初始化，请先调用 setRealtimeService')
    }
    return this.realtimeService
  }

  /**
   * 连接到 Realtime
   */
  async connect() {
    if (!this.realtimeService) {
      throw new Error('Realtime 服务未初始化')
    }

    try {
      this.status.value = Status.CONNECTING
      await this.realtimeService.connect()
      this.status.value = this.realtimeService.getStatus()
      this.lastError.value = null
      console.log('✅ Realtime 连接已建立')
    }
    catch (error) {
      this.status.value = Status.ERROR
      this.lastError.value = error as Error
      console.error('❌ Realtime 连接失败:', error)
      throw error
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (!this.realtimeService) {
      return
    }

    try {
      this.realtimeService.disconnect()
      this.status.value = Status.DISCONNECTED
      console.log('🔌 Realtime 连接已断开')
    }
    catch (error) {
      console.error('断开 Realtime 连接失败:', error)
    }
  }

  /**
   * 获取连接状态
   */
  getStatus(): RealtimeStatus {
    if (!this.realtimeService) {
      return Status.DISCONNECTED
    }
    return this.realtimeService.getStatus()
  }

  /**
   * 检查是否已连接
   */
  checkIsConnected(): boolean {
    if (!this.realtimeService) {
      return false
    }
    return this.realtimeService.isConnected()
  }

  /**
   * 设置状态监控
   */
  private setupStatusMonitor() {
    // 定期检查状态
    setInterval(() => {
      if (this.realtimeService) {
        const currentStatus = this.realtimeService.getStatus()
        if (this.status.value !== currentStatus) {
          this.status.value = currentStatus
        }
      }
    }, 1000)
  }

  /**
   * 清理资源
   */
  private cleanup() {
    if (this.realtimeService) {
      this.realtimeService.disconnect()
    }
  }
}

// 导出单例实例
export const realtimeManager = new RealtimeManager()
