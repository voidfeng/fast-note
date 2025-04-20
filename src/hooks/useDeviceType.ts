import { ref } from 'vue'

// 全局单一状态
const isDesktop = ref(false)

// 立即执行并永久监听
function updateDeviceType() {
  isDesktop.value = window.innerWidth >= 640
}

// 初始检测
updateDeviceType()

// 永久监听（不再移除）
window.addEventListener('resize', updateDeviceType)

export function useDeviceType() {
  return { isDesktop }
}
