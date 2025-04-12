<script setup lang="ts">
import { useSync } from '@/hooks/useSync'
import { useUserInfo } from '@/hooks/useUserInfo'
import { IonButton, IonSpinner } from '@ionic/vue'

const { sync, syncing } = useSync()

const { userInfo } = useUserInfo()

function onSync() {
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
</template>
