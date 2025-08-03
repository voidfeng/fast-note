<script setup lang="ts">
import { IonButton, IonIcon, IonItem, IonLabel, IonList, IonPopover } from '@ionic/vue'
import { contrastOutline, moonOutline, sunnyOutline } from 'ionicons/icons'
import { computed, onMounted, ref } from 'vue'

// 主题模式枚举
enum ThemeMode {
  Auto = 'auto',
  Light = 'light',
  Dark = 'dark',
}

// 当前主题模式
const currentMode = ref<ThemeMode>(ThemeMode.Auto)

// 使用 matchMedia 检查用户偏好
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')

// 是否显示弹出菜单
const showPopover = ref(false)

// 计算当前是否为深色模式
const isDarkMode = computed(() => {
  if (currentMode.value === ThemeMode.Auto) {
    return prefersDark.matches
  }
  return currentMode.value === ThemeMode.Dark
})

// 计算当前图标
const currentIcon = computed(() => {
  if (currentMode.value === ThemeMode.Auto) {
    return contrastOutline
  }
  return isDarkMode.value ? sunnyOutline : moonOutline
})

// 计算按钮标题
const buttonTitle = computed(() => {
  switch (currentMode.value) {
    case ThemeMode.Auto:
      return '自动主题（跟随系统）'
    case ThemeMode.Light:
      return '当前：浅色模式'
    case ThemeMode.Dark:
      return '当前：深色模式'
    default:
      return '主题设置'
  }
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

  // 关闭弹出菜单
  showPopover.value = false
}

// 切换弹出菜单
function togglePopover() {
  showPopover.value = !showPopover.value
}

onMounted(() => {
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
})
</script>

<template>
  <div class="dark-mode-toggle">
    <IonButton
      id="theme-mode-button"
      fill="clear"
      size="small"
      :title="buttonTitle"
      @click="togglePopover"
    >
      <IonIcon
        slot="icon-only"
        :icon="currentIcon"
        :class="{ 'dark-active': isDarkMode }"
      />
    </IonButton>

    <IonPopover trigger="theme-mode-button" :is-open="showPopover" @did-dismiss="showPopover = false">
      <IonList>
        <IonItem button :detail="false" @click="setThemeMode(ThemeMode.Auto)">
          <IonIcon slot="start" :icon="contrastOutline" />
          <IonLabel>自动（跟随系统）</IonLabel>
        </IonItem>
        <IonItem button :detail="false" @click="setThemeMode(ThemeMode.Light)">
          <IonIcon slot="start" :icon="moonOutline" />
          <IonLabel>浅色模式</IonLabel>
        </IonItem>
        <IonItem button :detail="false" @click="setThemeMode(ThemeMode.Dark)">
          <IonIcon slot="start" :icon="sunnyOutline" />
          <IonLabel>深色模式</IonLabel>
        </IonItem>
      </IonList>
    </IonPopover>
  </div>
</template>

<style scoped>
.dark-mode-toggle {
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.dark-active {
  color: var(--ion-color-warning);
}

ion-button {
  --padding-start: 8px;
  --padding-end: 8px;
}

ion-popover {
  --width: 200px;
}

ion-item {
  --padding-start: 16px;
  --padding-end: 16px;
  cursor: pointer;
}
</style>
