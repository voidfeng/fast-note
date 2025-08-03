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
import { ref, watch } from 'vue'
import { login } from '@/api'
import { useDeviceType } from '@/hooks/useDeviceType'
import { useExtensions } from '@/hooks/useExtensions'
import { useUserInfo } from '@/hooks/useUserInfo'

const router = useIonRouter()
const { isExtensionEnabled, getExtensionModule } = useExtensions()
const { isDesktop } = useDeviceType()
const { refreshUserInfoFromCookie, setCookiesFromHeaders } = useUserInfo()

// 动态获取同步功能
const syncFunction = ref<Function | null>(null)

// 监听同步扩展的加载状态
watch(() => isExtensionEnabled('sync'), async (enabled) => {
  if (enabled) {
    // 如果同步扩展已启用，动态获取其钩子函数
    const syncModule = getExtensionModule('sync')
    if (syncModule && syncModule.useSync) {
      const { sync } = syncModule.useSync()
      syncFunction.value = sync
    }
  }
  else {
    syncFunction.value = null
  }
}, { immediate: true })

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

    // 登录成功后保存cookie到localStorage
    const cookies = document.cookie.split('; ')
    if (cookies.length > 0) {
      setCookiesFromHeaders(cookies)
    }

    // 只有登录成功后且同步功能可用时才进行同步
    if (syncFunction.value) {
      const syncLoading = await loadingController.create({ message: '正在同步...' })
      syncLoading.present()
      try {
        await syncFunction.value()
      }
      finally {
        syncLoading.dismiss()
      }
    }

    router.back()
  }
  finally {
    loginLoading.dismiss()
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
