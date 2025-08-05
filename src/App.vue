<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { onMounted } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useVisualViewport } from './hooks/useVisualViewport'

const { initTheme } = useTheme()

useVisualViewport(true)

onMounted(() => {
  // 初始化主题
  initTheme()
})
</script>

<template>
  <IonApp>
    <IonRouterOutlet />
  </IonApp>
</template>
