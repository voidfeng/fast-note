import SyncState from './components/SyncState.vue'
import { useSync } from './hooks/useSync'

// 导出同步扩展的所有组件和钩子函数
export {
  SyncState,
  useSync,
}

// 扩展信息
export const syncExtension = {
  id: 'sync',
  name: '数据同步',
  description: '在设备间同步您的笔记和文件',
  icon: 'cloud-upload-outline',
}

// 默认导出
export default {
  install(app: any) {
    // 注册全局组件
    app.component('SyncState', SyncState)
  },
}
