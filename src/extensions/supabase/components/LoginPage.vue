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
import { useAuth } from '../hooks/useAuth'

const router = useIonRouter()
const { isDesktop } = useDeviceType()
const { login, register, resetPassword, sendEmailOTP, loginWithEmailOTP } = useAuth()

const isRegisterMode = ref(false)
const isOTPMode = ref(false) // 验证码登录模式
const loading = ref(false)
const otpSending = ref(false) // 发送验证码状态
const otpCountdown = ref(0) // 验证码倒计时
const error = ref('')
const message = ref('')

const formData = ref({
  email: '',
  password: '',
  confirmPassword: '',
  otp: '', // 验证码
})

function toggleMode() {
  isRegisterMode.value = !isRegisterMode.value
  isOTPMode.value = false
  error.value = ''
  message.value = ''
  formData.value.otp = ''
  otpCountdown.value = 0
}

function toggleOTPMode() {
  isOTPMode.value = !isOTPMode.value
  isRegisterMode.value = false
  error.value = ''
  message.value = ''
  formData.value.password = ''
  formData.value.confirmPassword = ''
  formData.value.otp = ''
  otpCountdown.value = 0
}

// 开始倒计时
function startCountdown() {
  otpCountdown.value = 60
  const timer = setInterval(() => {
    otpCountdown.value--
    if (otpCountdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

async function handleSubmit() {
  // 验证码登录模式
  if (isOTPMode.value) {
    if (!formData.value.email || !formData.value.otp) {
      const alert = await alertController.create({
        header: '提示',
        message: '请输入邮箱和验证码',
        buttons: ['确定'],
      })
      alert.present()
      return
    }

    const loadingInstance = await loadingController.create({
      message: '正在验证登录...',
    })
    loadingInstance.present()

    try {
      error.value = ''
      message.value = ''

      const { success, error: otpError } = await loginWithEmailOTP(formData.value.email, formData.value.otp)
      if (!success || otpError) {
        throw new Error(otpError || '验证码登录失败')
      }
      // 登录成功，返回上一页
      router.back()
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : '验证码登录失败'
      console.error('验证码登录错误:', err)
    }
    finally {
      loadingInstance.dismiss()
    }
    return
  }

  // 密码登录模式
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

// 发送验证码
async function handleSendOTP() {
  if (!formData.value.email) {
    const alert = await alertController.create({
      header: '提示',
      message: '请先输入邮箱地址',
      buttons: ['确定'],
    })
    alert.present()
    return
  }

  otpSending.value = true
  error.value = ''
  message.value = ''

  try {
    const { success, error: otpError } = await sendEmailOTP(formData.value.email)
    if (!success || otpError) {
      throw new Error(otpError || '发送验证码失败')
    }
    message.value = '验证码已发送到您的邮箱，请查收'
    startCountdown()
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '发送验证码失败'
    console.error('发送验证码错误:', err)
  }
  finally {
    otpSending.value = false
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
            {{ isRegisterMode ? '创建账户' : (isOTPMode ? '验证码登录' : '用户登录') }}
          </h1>

          <div class="h4" />

          <div class="text-center">
            <IonButton
              v-if="!isOTPMode"
              fill="clear"
              size="small"
              @click="toggleMode"
            >
              {{ isRegisterMode ? '已有账户？立即登录' : '还没有账户？立即注册' }}
            </IonButton>

            <IonButton
              v-if="!isRegisterMode"
              fill="clear"
              size="small"
              @click="toggleOTPMode"
            >
              {{ isOTPMode ? '使用密码登录' : '使用验证码登录' }}
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

          <!-- 密码登录模式 -->
          <IonInput
            v-if="!isOTPMode"
            v-model="formData.password"
            label="密码"
            label-placement="floating"
            fill="outline"
            placeholder="请输入密码"
            type="password"
            mode="md"
          />

          <div v-if="isRegisterMode && !isOTPMode" class="h4" />

          <IonInput
            v-if="isRegisterMode && !isOTPMode"
            v-model="formData.confirmPassword"
            label="确认密码"
            label-placement="floating"
            fill="outline"
            placeholder="请确认密码"
            type="password"
            mode="md"
          />

          <!-- 验证码登录模式 -->
          <div v-if="isOTPMode" class="h4" />

          <div v-if="isOTPMode" class="flex gap-2">
            <IonInput
              v-model="formData.otp"
              :maxlength="6"
              label="验证码"
              label-placement="floating"
              fill="outline"
              placeholder="请输入6位验证码"
              type="text"
              mode="md"
              class="flex-1"
            />
            <IonButton
              :disabled="otpSending || otpCountdown > 0 || !formData.email"
              @click="handleSendOTP"
            >
              <IonSpinner v-if="otpSending" name="crescent" class="mr-1" />
              {{ otpSending ? '发送中' : (otpCountdown > 0 ? `${otpCountdown}s` : '发送验证码') }}
            </IonButton>
          </div>

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
            {{ loading ? '处理中...' : (isRegisterMode ? '注册' : (isOTPMode ? '验证码登录' : '密码登录')) }}
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
