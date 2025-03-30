import { computed, onMounted, onUnmounted, ref } from 'vue'

export function useDesktop() {
  const windowWidth = ref(0)

  const noteDesktop = computed(() => {
    return windowWidth.value >= 640
  })

  // 更新窗口宽度的函数
  function updateWindowWidth() {
    windowWidth.value = window.innerWidth
  }

  // 组件挂载时添加监听
  onMounted(() => {
    windowWidth.value = window.innerWidth
    window.addEventListener('resize', updateWindowWidth)
  })

  // 组件卸载时移除监听
  onUnmounted(() => {
    window.removeEventListener('resize', updateWindowWidth)
  })

  return {
    noteDesktop,
  }
}
