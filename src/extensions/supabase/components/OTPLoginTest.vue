<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { ref } from 'vue'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'

const { sendEmailOTP, loginWithEmailOTP, userInfo, isLoggedIn } = useSupabaseAuth()

const email = ref('')
const otp = ref('')
const message = ref('')
const error = ref('')

async function handleSendOTP() {
  if (!email.value) {
    error.value = '请输入邮箱地址'
    return
  }

  try {
    error.value = ''
    message.value = '正在发送验证码...'

    const result = await sendEmailOTP(email.value)
    if (result.success) {
      message.value = '验证码已发送到您的邮箱，请查收'
    }
    else {
      error.value = result.error || '发送验证码失败'
      message.value = ''
    }
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '发送验证码失败'
    message.value = ''
  }
}

async function handleVerifyOTP() {
  if (!email.value || !otp.value) {
    error.value = '请输入邮箱和验证码'
    return
  }

  try {
    error.value = ''
    message.value = '正在验证...'

    const result = await loginWithEmailOTP(email.value, otp.value)
    if (result.success) {
      message.value = '登录成功！'
    }
    else {
      error.value = result.error || '验证码登录失败'
      message.value = ''
    }
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '验证码登录失败'
    message.value = ''
  }
}
</script>

<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>邮箱验证码登录测试</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent class="ion-padding">
      <div v-if="isLoggedIn" class="mb-4">
        <h2>登录成功！</h2>
        <p>用户信息：{{ userInfo?.email }}</p>
      </div>

      <div v-else>
        <IonList>
          <IonInput
            v-model="email"
            label="邮箱地址"
            label-placement="floating"
            fill="outline"
            placeholder="请输入邮箱地址"
            type="email"
            mode="md"
          />

          <div class="h4" />

          <IonButton
            expand="block"
            @click="handleSendOTP"
          >
            发送验证码
          </IonButton>

          <div class="h4" />

          <IonInput
            v-model="otp"
            :maxlength="6"
            label="验证码"
            label-placement="floating"
            fill="outline"
            placeholder="请输入6位验证码"
            type="text"
            mode="md"
          />

          <div class="h4" />

          <IonButton
            expand="block"
            @click="handleVerifyOTP"
          >
            验证登录
          </IonButton>
        </IonList>
      </div>

      <div v-if="message" class="mt-4">
        <IonItem color="success" lines="none">
          <IonLabel>{{ message }}</IonLabel>
        </IonItem>
      </div>

      <div v-if="error" class="mt-4">
        <IonItem color="danger" lines="none">
          <IonLabel>{{ error }}</IonLabel>
        </IonItem>
      </div>
    </IonContent>
  </IonPage>
</template>
