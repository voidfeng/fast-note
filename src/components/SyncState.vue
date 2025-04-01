<script setup lang="ts">
import { IonButton } from '@ionic/vue'
import { useUserInfo } from '@/hooks/useUserInfo'
import { useSync } from '@/hooks/useSync'

const { sync } = useSync()

const { userInfo } = useUserInfo()

function onSync() {
  console.log('手动同步')
  sync()
}
</script>

<template>
  <ion-button
    v-if="!userInfo.userid"
    router-link="/login"
    router-direction="forward"
    size="small"
    fill="outline"
    class="ml4 mb4"
  >
    开启同步
  </ion-button>
  <ion-button v-else size="small" fill="outline" class="ml4 mb4" @click="onSync"> 同步 </ion-button>
</template>
