/**
 * Realtime 连接 Hook
 * 提供响应式的 Realtime 连接管理
 */
import type { RealtimeEvent, RealtimeStatus } from '@/core/realtime'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getRealtimeInstance } from '@/core/realtime'

/**
 * Realtime 连接 Hook
 */
export function useRealtime() {
  const realtime = getRealtimeInstance()

  // 响应式状态
  const status = ref<RealtimeStatus>(realtime.getStatus())
  const lastMessage = ref<RealtimeEvent | null>(null)
  const lastError = ref<Error | null>(null)

  // 计算属性
  const isConnected = computed(() => status.value === 'connected')
  const isConnecting = computed(() =>
    status.value === 'connecting'
    || status.value === 'reconnecting',
  )
  const hasError = computed(() => status.value === 'error')

  /**
   * 连接到 Realtime
   */
  async function connect() {
    try {
      await realtime.connect()
    }
    catch (error) {
      console.error('连接 Realtime 失败:', error)
      throw error
    }
  }

  /**
   * 断开 Realtime 连接
   */
  function disconnect() {
    realtime.disconnect()
  }

  /**
   * 设置状态变化回调
   */
  function onStatusChange(_callback: (newStatus: RealtimeStatus) => void) {
    // 此功能需要在 realtime 实例中添加监听器管理
    // 这里暂时直接更新 ref
    status.value = realtime.getStatus()
  }

  /**
   * 设置消息回调
   */
  function onMessage(_callback: (event: RealtimeEvent) => void) {
    // 此功能需要在 realtime 实例中添加监听器管理
    lastMessage.value = null
  }

  /**
   * 设置错误回调
   */
  function onError(_callback: (error: Error) => void) {
    // 此功能需要在 realtime 实例中添加监听器管理
    lastError.value = null
  }

  return {
    // 状态
    status: computed(() => status.value),
    isConnected,
    isConnecting,
    hasError,
    lastMessage: computed(() => lastMessage.value),
    lastError: computed(() => lastError.value),

    // 方法
    connect,
    disconnect,
    onStatusChange,
    onMessage,
    onError,
  }
}

/**
 * 自动管理 Realtime 连接的 Hook
 * 在组件挂载时自动连接，卸载时自动断开
 */
export function useAutoRealtime() {
  const realtimeHook = useRealtime()

  // 组件挂载时自动连接
  onMounted(async () => {
    try {
      await realtimeHook.connect()
    }
    catch (error) {
      console.error('自动连接 Realtime 失败:', error)
    }
  })

  // 组件卸载时自动断开
  onUnmounted(() => {
    // 注意：这里不断开连接，因为是全局单例
    // 如果需要在组件卸载时断开，取消注释下一行
    // realtimeHook.disconnect()
  })

  return realtimeHook
}
