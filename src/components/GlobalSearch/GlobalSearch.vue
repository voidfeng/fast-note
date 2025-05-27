<script setup lang="ts">
import { IonContent, IonSearchbar } from '@ionic/vue'
import { reactive, ref } from 'vue'
import { useGlobalSearch } from './useGlobalSearch'

const { showGlobalSearch, showGlobalSearchState } = useGlobalSearch()

const fullScreenRef = ref<HTMLDivElement>()
const state = reactive({
  cacheTop: 0,
  top: 0,
})

function onFocus() {
  showGlobalSearch.value = true
  const rect = fullScreenRef.value!.getBoundingClientRect()
  state.cacheTop = rect.top
  state.top = rect.top
  showGlobalSearchState.value = 'enterStart'
  setTimeout(() => {
    showGlobalSearchState.value = 'enterActive'
    state.top = 8
  }, 1)
}

function onCancel() {
  state.top = state.cacheTop
  showGlobalSearch.value = false
  showGlobalSearchState.value = 'leaveStart'
  setTimeout(() => {
    showGlobalSearchState.value = 'hide'
  }, 300)
}
</script>

<template>
  <div class="global-search h-[36px]">
    <div
      ref="fullScreenRef"
      :class="{
        'global-search__full-screen': ['enterActive', 'leaveStart'].includes(showGlobalSearchState),
        'enter-active': showGlobalSearchState === 'enterActive',
        'leave-start': showGlobalSearchState === 'leaveStart',
      }"
      :style="{ top: `${state.top}px` }"
      class="global-search__full-container flex flex-col"
    >
      <IonSearchbar
        :show-cancel-button="showGlobalSearch ? 'always' : 'never'"
        placeholder="搜索"
        cancel-button-text="取消"
        @ion-focus="onFocus"
        @ion-cancel="onCancel"
      />
      <div class="flex-1 py-2 px-4">
        <IonContent>
          仍在开发中...
        </IonContent>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.global-search {
  padding: 0;
  &__full-container {
    background-color: transparent;
  }
  &__full-screen {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    transition: all 300ms ease-in-out;
    background-color: black;
    &.enter-active {
      background-color: black;
      ion-content {
        opacity: 1;
      }
    }
    &.leave-start {
      background-color: transparent;
      ion-content {
        opacity: 0;
      }
    }
  }
  ion-content {
    --background: transparent;
    transition: opacity 300ms ease-in-out;
    opacity: 0;
  }
}
</style>
