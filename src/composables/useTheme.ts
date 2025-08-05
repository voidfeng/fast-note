import { computed, ref } from 'vue'

// 主题模式枚举
export enum ThemeMode {
  Auto = 'auto',
  Light = 'light',
  Dark = 'dark',
}

// 当前主题模式
const currentMode = ref<ThemeMode>(ThemeMode.Auto)

// 使用 matchMedia 检查用户偏好
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')

// 计算当前是否为深色模式
const isDarkMode = computed(() => {
  if (currentMode.value === ThemeMode.Auto) {
    return prefersDark.matches
  }
  return currentMode.value === ThemeMode.Dark
})

// 在 html 元素上添加或移除 "ion-palette-dark" 类
function applyDarkMode(isDark: boolean) {
  document.documentElement.classList.toggle('ion-palette-dark', isDark)
}

// 设置主题模式
function setThemeMode(mode: ThemeMode) {
  currentMode.value = mode
  localStorage.setItem('themeMode', mode)

  // 应用深色模式
  if (mode === ThemeMode.Auto) {
    applyDarkMode(prefersDark.matches)
  }
  else {
    applyDarkMode(mode === ThemeMode.Dark)
  }
}

// 初始化主题
function initTheme() {
  // 首先检查 localStorage 中的用户偏好
  const savedThemeMode = localStorage.getItem('themeMode') as ThemeMode | null

  if (savedThemeMode && Object.values(ThemeMode).includes(savedThemeMode as ThemeMode)) {
    // 如果有保存的偏好，使用保存的值
    currentMode.value = savedThemeMode as ThemeMode
  }
  else {
    // 否则默认为自动模式
    currentMode.value = ThemeMode.Auto
  }

  // 应用初始主题
  if (currentMode.value === ThemeMode.Auto) {
    applyDarkMode(prefersDark.matches)
  }
  else {
    applyDarkMode(currentMode.value === ThemeMode.Dark)
  }

  // 监听系统偏好变化（仅在自动模式时生效）
  prefersDark.addEventListener('change', (mediaQuery) => {
    if (currentMode.value === ThemeMode.Auto) {
      applyDarkMode(mediaQuery.matches)
    }
  })
}

export function useTheme() {
  return {
    currentMode,
    isDarkMode,
    ThemeMode,
    setThemeMode,
    initTheme,
  }
}
