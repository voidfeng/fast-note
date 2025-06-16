import { toastController } from '@ionic/vue'
import { reactive } from 'vue'

const unSupportText = '此浏览器不支持生物识别，请更换设备再查看！'

export interface WebAuthnState {
  isSupported: boolean
  isRegistered: boolean
  isRegistering: boolean
  isVerifying: boolean
  errorMessage: string | null
  successMessage: string | null
}

// 检查浏览器是否支持WebAuthn
const isWebAuthnSupported = typeof window !== 'undefined' && !!window.PublicKeyCredential

// 生成随机挑战
function generateChallenge(): ArrayBuffer {
  const challenge = new Uint8Array(32)
  window.crypto.getRandomValues(challenge)
  return challenge.buffer
}

// 保存凭据到 localStorage
function saveCredential(credentialId: ArrayBuffer) {
  const credentialIdBase64 = btoa(
    String.fromCharCode(...new Uint8Array(credentialId)),
  )
  localStorage.setItem('webauthn_credential_id', credentialIdBase64)
}

// 从 localStorage 获取凭据
function getCredentialId(): ArrayBuffer | null {
  const credentialIdBase64 = localStorage.getItem('webauthn_credential_id')
  if (!credentialIdBase64)
    return null

  const binary = atob(credentialIdBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// 检查是否已注册
function checkRegistrationStatus(): boolean {
  return localStorage.getItem('webauthn_credential_id') !== null
}

// 清除消息辅助函数
function clearMessages(state: WebAuthnState) {
  state.errorMessage = null
  state.successMessage = null
}

// 验证过期时间（毫秒）
const VERIFICATION_EXPIRY = 60 * 1000 // 1分钟

// 保存验证时间戳到 localStorage
function saveVerificationTimestamp(timestamp: number) {
  localStorage.setItem('webauthn_last_verified_at', timestamp.toString())
}

// 获取验证时间戳
function getVerificationTimestamp(): number | null {
  const timestamp = localStorage.getItem('webauthn_last_verified_at')
  return timestamp ? Number.parseInt(timestamp, 10) : null
}

// 检查验证是否过期
function isVerificationExpired(): boolean {
  const lastVerifiedAt = getVerificationTimestamp()
  if (!lastVerifiedAt)
    return true
  return Date.now() - lastVerifiedAt > VERIFICATION_EXPIRY
}

export function useWebAuthn() {
  // 状态管理
  const state = reactive<WebAuthnState>({
    isSupported: isWebAuthnSupported,
    isRegistered: false,
    isRegistering: false,
    isVerifying: false,
    errorMessage: null,
    successMessage: null,
  })

  // 初始检查注册状态
  state.isRegistered = checkRegistrationStatus()

  // 注册生物识别
  async function register() {
    clearMessages(state)

    if (!state.isSupported) {
      state.errorMessage = unSupportText
      const toast = await toastController.create({
        message: unSupportText,
        duration: 1500,
        position: 'top',
      })

      await toast.present()
      return false
    }

    state.isRegistering = true

    try {
      const challenge = generateChallenge()

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'WebAuthn本地测试',
          id: window.location.hostname,
        },
        user: {
          id: new Uint8Array([1, 2, 3, 4]), // 简化的固定用户ID
          name: 'local-user',
          displayName: '本地用户',
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // 使用平台认证器(指纹/人脸等)
          userVerification: 'required',
        },
        timeout: 60000,
      }

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential

      // 保存凭据ID到本地存储
      saveCredential(credential.rawId)

      state.successMessage = '生物识别注册成功！'
      state.isRegistered = true

      return true
    }
    catch (err: any) {
      const registerErrorText = `❌ 生物识别注册失败: ${err.message}`
      state.errorMessage = registerErrorText
      const toast = await toastController.create({
        message: registerErrorText,
        duration: 1500,
        position: 'top',
      })

      await toast.present()
      return false
    }
    finally {
      state.isRegistering = false
    }
  }

  // 验证生物识别
  async function verify(force = false) {
    clearMessages(state)

    if (!state.isSupported) {
      state.errorMessage = unSupportText
      const toast = await toastController.create({
        message: unSupportText,
        duration: 1500,
        position: 'top',
      })

      await toast.present()
      return false
    }

    if (!state.isRegistered) {
      state.errorMessage = '请先注册生物识别'
      return false
    }

    // 如果不是强制验证且验证未过期，直接返回成功
    if (!force && !isVerificationExpired()) {
      state.successMessage = '验证有效期内，无需重新验证'
      // 更新验证时间
      saveVerificationTimestamp(Date.now())
      return true
    }

    state.isVerifying = true

    try {
      const challenge = generateChallenge()
      const credentialId = getCredentialId()

      if (!credentialId) {
        throw new Error('找不到已保存的凭据')
      }

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [
          {
            id: credentialId,
            type: 'public-key',
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      }

      await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })

      // 更新验证时间
      saveVerificationTimestamp(Date.now())
      state.successMessage = '验证成功！'
      return true
    }
    catch (err: any) {
      state.errorMessage = `验证失败: ${err.message}`
      return false
    }
    finally {
      state.isVerifying = false
    }
  }

  // 清除已保存的凭据
  function clearCredentials() {
    localStorage.removeItem('webauthn_credential_id')
    localStorage.removeItem('webauthn_last_verified_at')
    state.isRegistered = false
    state.successMessage = '凭据已清除'
  }

  return {
    state,
    register,
    verify,
    clearCredentials,
    checkRegistrationStatus: () => {
      state.isRegistered = checkRegistrationStatus()
      return state.isRegistered
    },
    isVerificationExpired,
  }
}
