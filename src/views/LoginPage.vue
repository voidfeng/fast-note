<script setup lang="ts">
import {
  alertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonList,
  IonPage,
  IonToolbar,
  useIonRouter,
} from '@ionic/vue'
import { inject, ref } from 'vue'
import { login } from '@/api'

const noteDesktop = inject('noteDesktop')

 const router = useIonRouter()

const username = ref('')
const password = ref('')
async function onLogin() {
  if (!username.value || !password.value) {
    const alert = await alertController.create({ header: '请输入用户名和密码', buttons: ['确定'] })
    alert.present();
    return 
  }
  await login(username.value, password.value)
  router.back()
}
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button text="返回" default-href="/" />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div class="px4 flex items-center justify-center h-full">
        <IonList :class="{ 'w-full': !noteDesktop, 'w-90': noteDesktop }">
          <h1 class="text-center">用户登录</h1>
          <div class="h4"></div>
          <ion-input
            v-model="username"
            label="用户名"
            label-placement="floating"
            fill="outline"
            placeholder="请输入用户名"
            mode="md"
          />
          <div class="h4"></div>
          <ion-input
            v-model="password"
            label="密码"
            label-placement="floating"
            fill="outline"
            placeholder="请输入密码"
            type="password"
            mode="md"
          />
          <div class="h4"></div>
          <ion-button expand="block" @click="onLogin">登录</ion-button>
          <div class="h64"></div>
        </IonList>
      </div>
    </ion-content>
  </ion-page>
</template>
