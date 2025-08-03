<script setup lang="ts">
import { IonButton, IonSpinner } from '@ionic/vue'
import { computed } from 'vue'
import { useExtensions } from '@/hooks/useExtensions'
import { useUserInfo } from '@/hooks/useUserInfo'
import { useSync } from '../hooks/useSync'

const { sync, syncing } = useSync()
const { userInfo } = useUserInfo()
const { isExtensionEnabled } = useExtensions()

const version = window.version

// 计算属性：检查同步扩展是否启用
const syncEnabled = computed(() => isExtensionEnabled('sync'))

function onSync() {
  if (syncEnabled.value)
    sync()
}
</script>

<template>
  <IonButton
    v-if="!userInfo.userid"
    router-link="/login"
    router-direction="forward"
    size="small"
    fill="outline"
    class="ml4 mb4"
  >
    开启同步
  </IonButton>
  <IonButton v-else size="small" fill="outline" class="ml4 mb4" @click="onSync">
    <IonSpinner v-if="syncing" slot="start" class="w-4 h-4 mr-1" />
    {{ syncing ? '同步中...' : '同步' }}
  </IonButton>
  <span class="text-xs ml-1 text-gray-500">v{{ version }}</span>
</template>
