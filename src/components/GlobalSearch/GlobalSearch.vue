<script setup lang="ts">
import type { Note } from '@/hooks/useDexie'
import { IonContent, IonSearchbar } from '@ionic/vue'
import { reactive, ref } from 'vue'
import { useNote } from '@/hooks/useNote'
import { useGlobalSearch } from './useGlobalSearch'

const props = withDefaults(defineProps<{
  puuid?: string
}>(), {
  puuid: '',
})

const { showGlobalSearch, showGlobalSearchState } = useGlobalSearch()
const { searchNotesByPUuid } = useNote()

const fullScreenRef = ref<HTMLDivElement>()
const state = reactive({
  cacheTop: 0,
  top: 0,
  notes: [] as Note[],
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

function onInput(event: CustomEvent) {
  const value = (event.target as HTMLIonSearchbarElement).value
  if (value) {
    searchNotesByPUuid(props.puuid, value).then((_notes) => {
      // 处理搜索结果
      console.log(value, _notes)
      state.notes = _notes
    })
  }
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
        @ion-input="onInput"
      />
      <div class="flex-1 py-2 px-4">
        <IonContent>
          共{{ state.notes.length }}条结果
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
