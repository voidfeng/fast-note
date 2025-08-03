import SyncState from './components/SyncState.vue'
import { useSync } from './hooks/useSync'

// 导出同步扩展的所有组件和钩子函数
export {
  SyncState,
  useSync,
}

// 默认导出
export default {
  // 安装扩展
  install(app: any) {
    console.log('安装同步扩展')
    // 注册全局组件
    app.component('SyncState', SyncState)
  },

  // 卸载扩展
  uninstall(app: any) {
    console.log('卸载同步扩展')
    // 在Vue 3中，没有直接的方法来取消注册组件
    // 但我们可以通过其他方式处理卸载逻辑
  },
}
