<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { onMounted } from 'vue'
import { pocketbaseAuthAdapter } from '@/adapters/pocketbase/auth-adapter'
import { PocketBaseRealtimeAdapter } from '@/adapters/pocketbase/realtime-adapter'
import { authManager } from '@/core/auth-manager'
import { realtimeManager } from '@/core/realtime-manager'
import { useTheme } from '@/hooks/useTheme'
import { useVisualViewport } from './hooks/useVisualViewport'

const { initTheme } = useTheme()

useVisualViewport(true)

onMounted(async () => {
  // 初始化主题
  initTheme()

  // 初始化认证服务
  console.log('🚀 初始化认证服务...')
  authManager.setAuthService(pocketbaseAuthAdapter)
  await authManager.initialize()

  // 如果用户已登录，初始化 Realtime 连接
  if (authManager.isAuthenticated()) {
    console.log('🔌 用户已登录，初始化 Realtime 连接...')
    const realtimeAdapter = new PocketBaseRealtimeAdapter({
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 2000,
    })

    realtimeManager.setRealtimeService(realtimeAdapter)

    try {
      await realtimeManager.connect()
      console.log('✅ Realtime 连接初始化完成')
    }
    catch (error) {
      console.error('❌ Realtime 连接初始化失败:', error)
    }
  }
  else {
    console.log('👤 用户未登录，跳过 Realtime 连接')
  }
})
</script>

<template>
  <IonApp>
    <IonRouterOutlet />
  </IonApp>
</template>
