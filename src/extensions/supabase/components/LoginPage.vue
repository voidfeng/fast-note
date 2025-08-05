<script setup lang="ts">
import {
  alertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonToolbar,
  loadingController,
  useIonRouter,
} from '@ionic/vue'
import { ref } from 'vue'
import { useDeviceType } from '@/hooks/useDeviceType'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'

const router = useIonRouter()
const { isDesktop } = useDeviceType()
const { login, register, resetPassword } = useSupabaseAuth()

const isRegisterMode = ref(false)
const loading = ref(false)
const error = ref('')
const message = ref('')

const formData = ref({
  email: '',
  password: '',
  confirmPassword: '',
})

function toggleMode() {
  isRegisterMode.value = !isRegisterMode.value
  error.value = ''
  message.value = ''
}

async function handleSubmit() {
  if (!formData.value.email || !formData.value.password) {
    const alert = await alertController.create({
      header: '提示',
      message: '请输入邮箱和密码',
      buttons: ['确定'],
    })
    alert.present()
    return
  }

  if (isRegisterMode.value && formData.value.password !== formData.value.confirmPassword) {
    const alert = await alertController.create({
      header: '提示',
      message: '两次输入的密码不一致',
      buttons: ['确定'],
    })
    alert.present()
    return
  }

  const loadingInstance = await loadingController.create({
    message: isRegisterMode.value ? '正在注册...' : '正在登录...',
  })
  loadingInstance.present()

  try {
    error.value = ''
    message.value = ''

    if (isRegisterMode.value) {
      const { error: signUpError } = await register(formData.value.email, formData.value.password)
      if (signUpError) {
        throw new Error(signUpError.message)
      }
      message.value = '注册成功！请检查您的邮箱以验证账户。'
    }
    else {
      const { error: signInError } = await login(formData.value.email, formData.value.password)
      if (signInError) {
        throw new Error(signInError.message)
      }
      // 登录成功，返回上一页
      router.back()
    }
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '操作失败'
    console.error('认证错误:', err)
  }
  finally {
    loadingInstance.dismiss()
  }
}

async function handleForgotPassword() {
  if (!formData.value.email) {
    const alert = await alertController.create({
      header: '提示',
      message: '请先输入邮箱地址',
      buttons: ['确定'],
    })
    alert.present()
    return
  }

  const loadingInstance = await loadingController.create({
    message: '正在发送重置邮件...',
  })
  loadingInstance.present()

  try {
    const { error: resetError } = await resetPassword(formData.value.email)
    if (resetError) {
      throw new Error(resetError.message)
    }
    message.value = '密码重置邮件已发送，请检查您的邮箱。'
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '发送失败'
  }
  finally {
    loadingInstance.dismiss()
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
            {{ isRegisterMode ? '创建账户' : '用户登录' }}
          </h1>

          <div class="h4" />

          <div class="text-center">
            <IonButton
              fill="clear"
              size="small"
              @click="toggleMode"
            >
              {{ isRegisterMode ? '已有账户？立即登录' : '还没有账户？立即注册' }}
            </IonButton>
          </div>

          <div class="h4" />

          <IonInput
            v-model="formData.email"
            label="邮箱地址"
            label-placement="floating"
            fill="outline"
            placeholder="请输入邮箱地址"
            type="email"
            mode="md"
          />

          <div class="h4" />

          <IonInput
            v-model="formData.password"
            label="密码"
            label-placement="floating"
            fill="outline"
            placeholder="请输入密码"
            type="password"
            mode="md"
          />

          <div v-if="isRegisterMode" class="h4" />

          <IonInput
            v-if="isRegisterMode"
            v-model="formData.confirmPassword"
            label="确认密码"
            label-placement="floating"
            fill="outline"
            placeholder="请确认密码"
            type="password"
            mode="md"
          />

          <div class="h4" />

          <div v-if="!isRegisterMode" class="text-center mb-4">
            <IonButton
              fill="clear"
              size="small"
              @click="handleForgotPassword"
            >
              忘记密码？
            </IonButton>
          </div>

          <IonButton
            expand="block"
            :disabled="loading"
            @click="handleSubmit"
          >
            <IonSpinner v-if="loading" name="crescent" class="mr-2" />
            {{ loading ? '处理中...' : (isRegisterMode ? '注册' : '登录') }}
          </IonButton>

          <div v-if="error" class="h4" />

          <IonItem v-if="error" color="danger" lines="none">
            <IonLabel class="text-center">
              {{ error }}
            </IonLabel>
          </IonItem>

          <div v-if="message" class="h4" />

          <IonItem v-if="message" color="success" lines="none">
            <IonLabel class="text-center">
              {{ message }}
            </IonLabel>
          </IonItem>

          <div class="h64" />
        </IonList>
      </div>
    </IonContent>
  </IonPage>
</template>
