import type { Extension, ExtensionMetadata, ExtensionState } from '@/types/extension'
import { reactive, watch } from 'vue'

// 创建一个响应式状态来管理扩展
const state = reactive<ExtensionState>({
  extensions: [],
  initialized: false,
  loadedExtensions: {}, // 存储已加载的扩展模块
})

// 可用扩展的元数据
const availableExtensions = [
  {
    id: 'sync',
    name: '数据同步',
    description: '在设备间同步您的笔记和文件',
    icon: 'cloud-upload-outline',
    path: '/src/extensions/sync', // 扩展的路径
  },
]

// 初始化内置扩展
async function initExtensions() {
  if (state.initialized)
    return

  // 添加所有可用扩展的元数据
  state.extensions = availableExtensions.map(ext => ({
    ...ext,
    enabled: false, // 默认禁用
  }))

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

      // 加载已启用的扩展
      for (const ext of state.extensions) {
        if (ext.enabled) {
          await loadExtension(ext.id)
        }
      }
    }
    catch (e) {
      console.error('加载扩展状态失败:', e)
    }
  }

  state.initialized = true
}

// 动态加载扩展
async function loadExtension(id: string): Promise<boolean> {
  try {
    // 如果扩展已经加载，直接返回
    if (state.loadedExtensions[id]) {
      return true
    }

    const extension = state.extensions.find(ext => ext.id === id)
    if (!extension) {
      console.error(`扩展 ${id} 不存在`)
      return false
    }

    // 动态导入扩展模块
    let module

    // 根据扩展ID动态导入对应模块
    if (id === 'sync') {
      module = await import('../extensions/sync')
    }
    else {
      console.error(`未知的扩展ID: ${id}`)
      return false
    }

    // 如果扩展有安装方法，则调用它
    if (module.default && typeof module.default.install === 'function') {
      const app = (window as any).__VUE_APP__
      if (app) {
        module.default.install(app)
      }
      else {
        console.warn(`无法安装扩展 ${id}，应用实例不可用`)
      }
    }

    // 存储已加载的扩展模块
    state.loadedExtensions[id] = module
    console.log(`扩展 ${id} 已加载`)
    return true
  }
  catch (error) {
    console.error(`加载扩展 ${id} 失败:`, error)
    return false
  }
}

// 卸载扩展
function unloadExtension(id: string): boolean {
  // 如果扩展已加载，尝试调用其卸载方法
  if (state.loadedExtensions[id]) {
    const module = state.loadedExtensions[id]
    if (module.default && typeof module.default.uninstall === 'function') {
      try {
        const app = (window as any).__VUE_APP__
        if (app) {
          module.default.uninstall(app)
        }
      }
      catch (error) {
        console.error(`卸载扩展 ${id} 失败:`, error)
      }
    }

    // 从已加载扩展中移除
    delete state.loadedExtensions[id]
    console.log(`扩展 ${id} 已卸载`)
    return true
  }
  return false
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

  // 检查扩展是否已加载
  const isExtensionLoaded = (id: string) => !!state.loadedExtensions[id]

  // 切换扩展状态
  const toggleExtension = async (id: string) => {
    const extension = getExtension(id)
    if (!extension)
      return

    const newState = !extension.enabled
    extension.enabled = newState

    // 根据新状态加载或卸载扩展
    if (newState) {
      // 启用扩展时加载
      await loadExtension(id)
    }
    else {
      // 禁用扩展时卸载
      unloadExtension(id)
    }
  }

  // 启用扩展
  const enableExtension = async (id: string) => {
    const extension = getExtension(id)
    if (extension && !extension.enabled) {
      extension.enabled = true
      await loadExtension(id)
    }
  }

  // 禁用扩展
  const disableExtension = (id: string) => {
    const extension = getExtension(id)
    if (extension && extension.enabled) {
      extension.enabled = false
      unloadExtension(id)
    }
  }

  // 获取扩展模块
  const getExtensionModule = (id: string) => {
    return state.loadedExtensions[id] || null
  }

  return {
    extensions: state.extensions,
    getAllExtensions,
    getExtension,
    isExtensionEnabled,
    isExtensionLoaded,
    toggleExtension,
    enableExtension,
    disableExtension,
    getExtensionModule,
    loadExtension, // 导出loadExtension方法
  }
}
