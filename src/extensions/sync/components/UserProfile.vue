<script setup lang="ts">
import { alertController, IonButton, IonItem, IonLabel } from '@ionic/vue'
import { useAuth } from '../hooks/useAuth'

const { userInfo, userLogout, isLoggedIn } = useAuth()

async function onLogout() {
  const alert = await alertController.create({
    header: '确认登出',
    message: '确定要登出当前账户吗？',
    buttons: [
      {
        text: '取消',
        role: 'cancel',
      },
      {
        text: '确定',
        handler: () => {
          userLogout()
        },
      },
    ],
  })
  await alert.present()
}
</script>

<template>
  <div v-if="isLoggedIn" class="user-profile">
    <IonItem>
      <IonLabel>
        <h3>{{ userInfo.username }}</h3>
        <p>用户ID: {{ userInfo.userid }}</p>
      </IonLabel>
      <IonButton slot="end" fill="outline" size="small" @click="onLogout">
        登出
      </IonButton>
    </IonItem>
  </div>
  <div v-else class="login-prompt">
    <IonItem>
      <IonLabel>
        <h3>未登录</h3>
        <p>请登录以使用同步功能</p>
      </IonLabel>
      <IonButton slot="end" router-link="/sync/login" router-direction="forward">
        登录
      </IonButton>
    </IonItem>
  </div>
</template>

<style scoped>
.user-profile,
.login-prompt {
  margin: 1rem 0;
}
</style>
