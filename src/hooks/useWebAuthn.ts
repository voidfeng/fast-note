import { computed, reactive, ref } from 'vue'

export interface WebAuthnState {
  isSupported: boolean
  isRegistered: boolean
  isRegistering: boolean
  isVerifying: boolean
  errorMessage: string | null
  successMessage: string | null
}

export function useWebAuthn() {
  // 状态管理
  const state = reactive<WebAuthnState>({
    isSupported: !!window.PublicKeyCredential,
    isRegistered: false,
    isRegistering: false,
    isVerifying: false,
    errorMessage: null,
    successMessage: null,
  })

  // 检查是否已注册
  const checkRegistrationStatus = () => {
    state.isRegistered = localStorage.getItem('webauthn_credential_id') !== null
    return state.isRegistered
  }

  // 初始检查注册状态
  checkRegistrationStatus()

  // 清除消息
  const clearMessages = () => {
    state.errorMessage = null
    state.successMessage = null
  }

  // 生成随机挑战
  const generateChallenge = (): ArrayBuffer => {
    const challenge = new Uint8Array(32)
    window.crypto.getRandomValues(challenge)
    return challenge.buffer
  }

  // 保存凭据到 localStorage
  const saveCredential = (credentialId: ArrayBuffer) => {
    const credentialIdBase64 = btoa(
      String.fromCharCode(...new Uint8Array(credentialId)),
    )
    localStorage.setItem('webauthn_credential_id', credentialIdBase64)
  }

  // 从 localStorage 获取凭据
  const getCredentialId = (): ArrayBuffer | null => {
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

  // 注册生物识别
  const register = async () => {
    clearMessages()

    if (!state.isSupported) {
      state.errorMessage = '此浏览器不支持WebAuthn'
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
      state.errorMessage = `注册失败: ${err.message}`
      return false
    }
    finally {
      state.isRegistering = false
    }
  }

  // 验证生物识别
  const verify = async () => {
    clearMessages()

    if (!state.isSupported) {
      state.errorMessage = '此浏览器不支持WebAuthn'
      return false
    }

    if (!checkRegistrationStatus()) {
      state.errorMessage = '请先注册生物识别'
      return false
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
  const clearCredentials = () => {
    localStorage.removeItem('webauthn_credential_id')
    state.isRegistered = false
    state.successMessage = '凭据已清除'
  }

  return {
    state,
    register,
    verify,
    clearCredentials,
    checkRegistrationStatus,
  }
}
