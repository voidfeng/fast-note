<script setup lang="ts">
import type { Note } from '@/hooks/useDexie'
import type { DefineComponent, Ref } from 'vue'
import LongPressMenu from '@/components/LongPressMenu.vue'
import { useIonicLongPressList } from '@/hooks/useIonicLongPressList'
import { IonAccordionGroup, IonList } from '@ionic/vue'
import { reactive, ref } from 'vue'
import NoteListItem from './NoteListItem.vue'

withDefaults(
  defineProps<{
    dataList: Note[]
    allNotesCount?: number
    deletedNoteCount?: number
  }>(),
  {
    allNotesCount: 0,
    deletedNoteCount: 0,
  },
)

defineEmits(['refresh'])

const listRef = ref<DefineComponent>()
const longPressUUID = ref('')
const longPressMenuOpen = ref(false)
const state = reactive({
  currentFolder: '',
})

useIonicLongPressList(listRef as Ref<DefineComponent>, {
  itemSelector: 'ion-item', // 匹配 ion-item 元素
  duration: 500,
  pressedClass: 'item-long-press',
  onItemLongPress: async (element) => {
    const uuid = element.getAttribute('uuid')
    if (uuid) {
      longPressUUID.value = uuid
      longPressMenuOpen.value = true
    }
  },
})
</script>

<template>
  <IonList ref="listRef" inset>
    <IonAccordionGroup multiple>
      <NoteListItem
        :data="{
          uuid: 'allnotes',
          title: '全部备忘录',
          type: 'folder',
          puuid: '',
          noteCount: allNotesCount,
        } as Note"
        :class="{ active: state.currentFolder === 'allnotes' }"
        @selected="(uuid: string) => state.currentFolder = uuid"
      />
      <NoteListItem
        v-for="d in dataList"
        :key="d.uuid"
        :data="d"
        :class="{ active: state.currentFolder === d.uuid }"
        :uuid="d.uuid"
        @selected="(uuid: string) => state.currentFolder = uuid"
      />
      <NoteListItem
        v-if="deletedNoteCount > 0"
        :data="{
          uuid: 'deleted',
          title: '最近删除',
          type: 'folder',
          puuid: '',
          noteCount: deletedNoteCount,
        } as Note"
        :class="{ active: state.currentFolder === 'deleted' }"
        @selected="(uuid: string) => state.currentFolder = uuid"
      />
    </IonAccordionGroup>
  </IonList>

  <LongPressMenu
    :is-open="longPressMenuOpen"
    :uuid="longPressUUID"
    :items="[{ type: 'rename' }, { type: 'delete' }]"
    @did-dismiss="() => longPressMenuOpen = false"
    @refresh="$emit('refresh')"
  />
</template>
