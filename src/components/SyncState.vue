<script setup lang="ts">
import { useSync } from '@/hooks/useSync'
import { useUserInfo } from '@/hooks/useUserInfo'
import { IonButton } from '@ionic/vue'

const { sync } = useSync()

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
    同步
  </IonButton>
</template>
