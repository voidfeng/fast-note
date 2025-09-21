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
import { useSimpleBackButton } from '@/hooks/useSmartBackButton'
import { useAuth } from '../hooks/useAuth'

const router = useIonRouter()
const { isDesktop } = useDeviceType()
const { login } = useAuth()

// 简单的返回按钮
const { backButtonProps } = useSimpleBackButton('/', '返回')

const loading = ref(false)
const error = ref('')
const message = ref('')

const formData = ref({
  email: '',
  password: '',
})

async function handleLogin() {
  // 验证输入
  if (!formData.value.email || !formData.value.password) {
    const alert = await alertController.create({
      header: '提示',
      message: '请输入邮箱和密码',
      buttons: ['确定'],
    })
    alert.present()
    return
  }

  const loadingInstance = await loadingController.create({
    message: '正在登录...',
  })
  loadingInstance.present()

  try {
    error.value = ''
    message.value = ''
    loading.value = true

    const { success, error: loginError } = await login(formData.value.email, formData.value.password)
    if (!success || loginError) {
      throw new Error(loginError || '登录失败')
    }

    // 登录成功，显示成功消息并返回上一页
    message.value = '登录成功！'
    setTimeout(() => {
      router.back()
    }, 1000)
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败'
    console.error('登录错误:', err)
  }
  finally {
    loading.value = false
    loadingInstance.dismiss()
  }
}

function clearForm() {
  formData.value.email = ''
  formData.value.password = ''
  error.value = ''
  message.value = ''
}
</script>

<template>
  <IonPage>
    <IonHeader :translucent="true">
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton v-bind="backButtonProps" />
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <!-- 登录表单容器 -->
      <div class="flex items-center min-h-full justify-center px-4 py-8">
        <div
          :class="{
            'w-full max-w-md': !isDesktop,
            'w-full max-w-lg': isDesktop,
          }"
        >
          <!-- 标题 -->
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
              用户登录
            </h1>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              请输入您的邮箱和密码
            </p>
          </div>

          <!-- 登录表单 -->
          <IonList class="bg-transparent">
            <!-- 邮箱输入 -->
            <div class="mb-4">
              <IonInput
                v-model="formData.email"
                label="邮箱地址"
                label-placement="floating"
                fill="outline"
                placeholder="请输入邮箱地址"
                type="email"
                mode="md"
                class="rounded-lg"
                :disabled="loading"
              />
            </div>

            <!-- 密码输入 -->
            <div class="mb-6">
              <IonInput
                v-model="formData.password"
                label="密码"
                label-placement="floating"
                fill="outline"
                placeholder="请输入密码"
                type="password"
                mode="md"
                class="rounded-lg"
                :disabled="loading"
                @keyup.enter="handleLogin"
              />
            </div>

            <!-- 登录按钮 -->
            <div class="mb-4">
              <IonButton
                expand="block"
                size="large"
                :disabled="loading || !formData.email || !formData.password"
                class="rounded-lg font-medium"
                @click="handleLogin"
              >
                <IonSpinner v-if="loading" name="crescent" class="mr-2" />
                {{ loading ? '登录中...' : '登录' }}
              </IonButton>
            </div>

            <!-- 清空表单按钮 -->
            <div class="text-center">
              <IonButton
                fill="clear"
                size="small"
                :disabled="loading"
                class="text-gray-600 dark:text-gray-400"
                @click="clearForm"
              >
                清空表单
              </IonButton>
            </div>

            <!-- 错误提示 -->
            <div v-if="error" class="mt-4">
              <IonItem color="danger" lines="none" class="rounded-lg">
                <IonLabel class="text-center whitespace-pre-wrap">
                  <ion-icon name="alert-circle" class="mr-2" />
                  {{ error }}
                </IonLabel>
              </IonItem>
            </div>

            <!-- 成功提示 -->
            <div v-if="message" class="mt-4">
              <IonItem color="success" lines="none" class="rounded-lg">
                <IonLabel class="text-center whitespace-pre-wrap">
                  <ion-icon name="checkmark-circle" class="mr-2" />
                  {{ message }}
                </IonLabel>
              </IonItem>
            </div>
          </IonList>
        </div>
      </div>
    </IonContent>
  </IonPage>
</template>
