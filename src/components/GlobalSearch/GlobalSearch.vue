<script setup lang="ts">
import type { Note } from '@/types'
import { IonContent, IonSearchbar } from '@ionic/vue'
import { useDebounceFn } from '@vueuse/core'
import { reactive, ref } from 'vue'
import NoteList from '@/components/NoteList.vue'
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

const debouncedSearch = useDebounceFn(async (searchText: string) => {
  if (searchText) {
    const _notes = await searchNotesByPUuid(props.puuid, '全部', searchText)
    // 处理搜索结果
    state.notes = _notes
  }
  else {
    // 当搜索文本为空时，清空搜索结果
    state.notes = []
  }
}, 300)

function onInput(event: CustomEvent) {
  const value = (event.target as HTMLIonSearchbarElement).value
  debouncedSearch(value!)
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
      <div class="flex-1">
        <IonContent>
          <template v-if="state.notes.length > 0">
            <div class="px-4 flex justify-between">
              <h2 class="mb0">
                备忘录
              </h2>
              <h2 class="mb0 text-gray-400">
                共<span class="mx-1">{{ state.notes.length }}</span>条结果
              </h2>
            </div>
            <NoteList
              :data-list="state.notes"
              :all-notes-count="state.notes.length"
              show-parent-folder
            />
          </template>
          <div class="h-11" />
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
    ion-searchbar {
      padding-bottom: 8px !important;
    }
  }
  ion-content {
    --background: transparent;
    transition: opacity 300ms ease-in-out;
    opacity: 0;
  }
}
</style>
