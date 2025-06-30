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
  loadingController,
  useIonRouter,
} from '@ionic/vue'
import { ref } from 'vue'
import { login } from '@/api'
import { useDeviceType } from '@/hooks/useDeviceType'
import { useSync } from '@/hooks/useSync'
import { useUserInfo } from '@/hooks/useUserInfo'

const router = useIonRouter()
const { sync } = useSync()
const { isDesktop } = useDeviceType()
const { refreshUserInfoFromCookie } = useUserInfo()

const username = ref('')
const password = ref('')
async function onLogin() {
  if (!username.value || !password.value) {
    const alert = await alertController.create({ header: '请输入用户名和密码', buttons: ['确定'] })
    alert.present()
    return
  }
  const loginLoading = await loadingController.create({ message: '正在登录...' })
  loginLoading.present()
  try {
    await login(username.value, password.value)
    refreshUserInfoFromCookie()
    router.back()
  }
  finally {
    loginLoading.dismiss()
  }

  const syncLoading = await loadingController.create({ message: '正在同步...' })
  syncLoading.present()
  try {
    await sync()
  }
  finally {
    syncLoading.dismiss()
  }
}
</script>

<template>
  <IonPage>
    <IonHeader :translucent="true">
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton text="返回" default-href="/" />
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent :fullscreen="true">
      <div class="px4 flex items-center justify-center h-full">
        <IonList :class="{ 'w-full': !isDesktop, 'w-90': isDesktop }">
          <h1 class="text-center">
            用户登录
          </h1>
          <div class="h4" />
          <IonInput
            v-model="username"
            label="用户名"
            label-placement="floating"
            fill="outline"
            placeholder="请输入用户名"
            mode="md"
          />
          <div class="h4" />
          <IonInput
            v-model="password"
            label="密码"
            label-placement="floating"
            fill="outline"
            placeholder="请输入密码"
            type="password"
            mode="md"
          />
          <div class="h4" />
          <IonButton expand="block" @click="onLogin">
            登录
          </IonButton>
          <div class="h64" />
        </IonList>
      </div>
    </IonContent>
  </IonPage>
</template>
