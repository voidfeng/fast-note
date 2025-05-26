<script setup lang="ts">
import { IonSearchbar } from '@ionic/vue'
import { nextTick, reactive, ref } from 'vue'
import { useGlobalSearch } from './useGlobalSearch'

const { showGlobalSearch } = useGlobalSearch()

const fullScreenRef = ref<HTMLDivElement>()
const state = reactive({
  top: 0,
  transition: false,
})

function onFocus() {
  showGlobalSearch.value = true
  const rect = fullScreenRef.value!.getBoundingClientRect()
  state.top = rect.top
  setTimeout(() => {
    state.transition = true
    state.top = 0
  }, 1)
  // setTimeout(() => {
  //   state.top = 0
  // }, 300)
}
</script>

<template>
  <div class="global-search h-[36px]">
    <div
      ref="fullScreenRef"
      :class="{ 'global-search__full-screen': showGlobalSearch }"
      :style="{ top: `${state.top}px`, transition: state.transition ? 'top 0.3s ease-in-out' : 'none' }"
    >
      <IonSearchbar placeholder="搜索" @ion-focus="onFocus" />
    </div>
  </div>
</template>

<style lang="scss">
.global-search {
  &__full-screen {
    position: fixed;
    left: 0;
    right: 0;
    z-index: 1000;
  }
}
</style>
