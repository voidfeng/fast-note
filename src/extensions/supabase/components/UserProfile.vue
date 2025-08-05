<script setup lang="ts">
import {
  alertController,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  loadingController,
  useIonRouter,
} from '@ionic/vue'
import { logInOutline, personCircleOutline } from 'ionicons/icons'
import { computed } from 'vue'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'

const router = useIonRouter()
const { currentUser, logout, isLoggedIn } = useSupabaseAuth()

function handleLogin() {
  router.push('/supabase/login')
}

async function handleLogout() {
  const alert = await alertController.create({
    header: '确认登出',
    message: '您确定要登出吗？',
    buttons: [
      {
        text: '取消',
        role: 'cancel',
      },
      {
        text: '确定',
        handler: async () => {
          const loading = await loadingController.create({
            message: '正在登出...',
          })
          loading.present()

          try {
            await logout()
          }
          catch (error) {
            console.error('登出失败:', error)
          }
          finally {
            loading.dismiss()
          }
        },
      },
    ],
  })
  alert.present()
}
</script>

<template>
  <div v-if="!isLoggedIn">
    <IonButton fill="clear" size="small" @click="handleLogin">
      <IonIcon slot="start" :icon="logInOutline" />
      登录
    </IonButton>
  </div>

  <div v-else>
    <IonButton fill="clear" size="small" @click="handleLogout">
      <IonIcon slot="start" :icon="personCircleOutline" />
      {{ currentUser?.email || '用户' }}
    </IonButton>
  </div>
</template>
