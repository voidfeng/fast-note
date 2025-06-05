import { onMounted, ref } from 'vue';

// localStorage 键名
const STORAGE_KEY_CREDENTIAL_ID = 'webauthn_credential_id';
const STORAGE_KEY_PUBLIC_KEY = 'webauthn_public_key';

/**
 * WebAuthn生物识别认证的可组合函数
 * 
 * 此可组合函数提供了使用Web Authentication API注册和验证生物识别凭据的功能
 * 使用localStorage存储凭据，无需服务端交互
 * 
 * @returns {object} 认证方法和状态
 */
export function useWebAuthn() {
  const isRegistered = ref(false);
  const isVerified = ref(false);
  const error = ref(null);
  const loading = ref(false);
  const credentialId = ref(null);
  const publicKey = ref(null);
  
  /**
   * 从localStorage加载凭据
   */
  const loadCredentialsFromStorage = () => {
    try {
      const storedCredentialId = localStorage.getItem(STORAGE_KEY_CREDENTIAL_ID);
      const storedPublicKey = localStorage.getItem(STORAGE_KEY_PUBLIC_KEY);
      
      if (storedCredentialId && storedPublicKey) {
        credentialId.value = storedCredentialId;
        publicKey.value = storedPublicKey;
        isRegistered.value = true;
      }
    } catch (err) {
      console.error('从本地存储加载凭据失败:', err);
    }
  };
  
  // 初始化时从localStorage加载凭据
  onMounted(() => {
    loadCredentialsFromStorage();
  });

  /**
   * 为WebAuthn操作生成随机挑战
   * @returns {Uint8Array} 随机挑战
   */
  const generateChallenge = () => {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    return challenge;
  };

  /**
   * 将ArrayBuffer转换为Base64字符串
   * @param {ArrayBuffer} buffer - 要转换的缓冲区
   * @returns {string} Base64编码的字符串
   */
  const bufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  /**
   * 将Base64字符串转换为ArrayBuffer
   * @param {string} base64 - 要转换的base64字符串
   * @returns {ArrayBuffer} 解码后的ArrayBuffer
   */
  const base64ToBuffer = (base64) => {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  /**
   * 注册新的生物识别凭据
   * @param {object} options - 注册选项
   * @param {string} options.username - 用户名或电子邮箱
   * @param {string} options.displayName - 用户显示名称
   * @param {string} options.rpName - 依赖方名称
   * @returns {Promise<object>} 注册结果
   */
  const register = async ({
    username = 'user@example.com',
    displayName = '用户',
    rpName = 'WebAuthn 应用'
  } = {}) => {
    if (!window.PublicKeyCredential) {
      error.value = '此浏览器不支持WebAuthn';
      return { success: false, error: '不支持WebAuthn' };
    }

    loading.value = true;
    error.value = null;

    try {
      // 生成随机用户ID
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      // 创建凭据选项
      const challenge = generateChallenge();
      const publicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: rpName },
        user: {
          id: userId,
          name: username,
          displayName
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ES256算法
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // 使用平台验证器 (TouchID, FaceID, Windows Hello)
          requireResidentKey: false,
          userVerification: 'required' // 要求用户验证（生物识别或PIN码）
        },
        timeout: 60000 // 1分钟
      };

      // 创建凭据
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      });

      // 处理并保存凭据数据
      // 获取凭据ID作为Uint8Array（用于潜在的服务器端处理）
      const attestationObject = credential.response.attestationObject;
      
      // 存储凭据数据
      credentialId.value = bufferToBase64(credential.rawId);
      publicKey.value = bufferToBase64(attestationObject);
      
      // 保存到localStorage
      localStorage.setItem(STORAGE_KEY_CREDENTIAL_ID, credentialId.value);
      localStorage.setItem(STORAGE_KEY_PUBLIC_KEY, publicKey.value);
      
      isRegistered.value = true;
      
      loading.value = false;
      return { 
        success: true, 
        credentialId: bufferToBase64(credential.rawId),
        publicKey: bufferToBase64(attestationObject)
      };
    } catch (err) {
      error.value = err.message || '注册失败';
      loading.value = false;
      return { success: false, error: err.message };
    }
  };

  /**
   * 使用先前注册的生物识别凭据验证用户身份
   * @returns {Promise<object>} 验证结果
   */
  const verify = async () => {
    if (!credentialId.value) {
      error.value = '没有注册凭据。请先进行注册。';
      return { success: false, error: '没有注册凭据' };
    }

    loading.value = true;
    error.value = null;
    isVerified.value = false;

    try {
      const challenge = generateChallenge();
      
      // 创建断言选项
      const publicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [{
          id: base64ToBuffer(credentialId.value),
          type: 'public-key'
        }],
        userVerification: 'required',
        timeout: 60000 // 1分钟
      };

      // 获取凭据
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      // 验证凭据
      const verified = bufferToBase64(assertion.rawId) === credentialId.value;
      isVerified.value = verified;
      
      loading.value = false;
      return { 
        success: verified, 
        credential: assertion
      };
    } catch (err) {
      error.value = err.message || '验证失败';
      loading.value = false;
      return { success: false, error: err.message };
    }
  };

  /**
   * 清除存储的凭据数据
   */
  const clearCredentials = () => {
    credentialId.value = null;
    publicKey.value = null;
    isRegistered.value = false;
    isVerified.value = false;
    error.value = null;
    
    // 从localStorage中清除
    localStorage.removeItem(STORAGE_KEY_CREDENTIAL_ID);
    localStorage.removeItem(STORAGE_KEY_PUBLIC_KEY);
  };
  
  

  /**
   * 检查当前浏览器是否支持WebAuthn
   * @returns {boolean} 是否支持WebAuthn
   */
  const isWebAuthnSupported = () => {
    return window.PublicKeyCredential !== undefined;
  };

  return {
    register,
    verify,
    clearCredentials,
    isWebAuthnSupported,
    isRegistered,
    isVerified,
    error,
    loading,
    credentialId,
    publicKey
  };
};

export default useWebAuthn;
