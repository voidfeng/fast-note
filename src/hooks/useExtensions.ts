import type { Extension, ExtensionState } from '@/types/extension'
import { reactive, watch } from 'vue'
import { syncExtension } from '@/extensions/sync'

// 创建一个响应式状态来管理扩展
const state = reactive<ExtensionState>({
  extensions: [],
  initialized: false,
})

// 初始化内置扩展
function initExtensions() {
  if (state.initialized)
    return

  // 添加同步扩展
  state.extensions.push({
    ...syncExtension,
    enabled: true, // 默认启用
  })

  // 从本地存储加载扩展状态
  const savedExtensions = localStorage.getItem('app_extensions')
  if (savedExtensions) {
    try {
      const parsed = JSON.parse(savedExtensions)
      // 合并保存的状态和默认状态
      state.extensions = state.extensions.map((ext) => {
        const savedExt = parsed.find((se: Extension) => se.id === ext.id)
        return savedExt ? { ...ext, enabled: savedExt.enabled } : ext
      })
    }
    catch (e) {
      console.error('加载扩展状态失败:', e)
    }
  }

  state.initialized = true
}

// 保存扩展状态到本地存储
function saveExtensionState() {
  localStorage.setItem('app_extensions', JSON.stringify(state.extensions))
}

// 监听扩展状态变化并保存
watch(() => [...state.extensions], saveExtensionState, { deep: true })

export function useExtensions() {
  // 确保扩展已初始化
  if (!state.initialized)
    initExtensions()

  // 获取所有扩展
  const getAllExtensions = () => state.extensions

  // 获取特定扩展
  const getExtension = (id: string) => state.extensions.find(ext => ext.id === id)

  // 检查扩展是否启用
  const isExtensionEnabled = (id: string) => {
    const extension = getExtension(id)
    return extension ? extension.enabled : false
  }

  // 切换扩展状态
  function toggleExtension(id: string) {
    const extension = getExtension(id)
    if (extension)
      extension.enabled = !extension.enabled
  }

  // 启用扩展
  function enableExtension(id: string) {
    const extension = getExtension(id)
    if (extension)
      extension.enabled = true
  }

  // 禁用扩展
  function disableExtension(id: string) {
    const extension = getExtension(id)
    if (extension)
      extension.enabled = false
  }

  return {
    extensions: state.extensions,
    getAllExtensions,
    getExtension,
    isExtensionEnabled,
    toggleExtension,
    enableExtension,
    disableExtension,
  }
}
