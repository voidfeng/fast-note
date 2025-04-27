<script setup lang="ts">
import type { ItemType } from '@/components/LongPressMenu.vue'
import type { Note } from '@/hooks/useDexie'
import type { DefineComponent, Ref } from 'vue'
import LongPressMenu from '@/components/LongPressMenu.vue'
import { useIonicLongPressList } from '@/hooks/useIonicLongPressList'
import { IonAccordionGroup, IonList } from '@ionic/vue'
import { ref } from 'vue'
import NoteListItem from './NoteListItem.vue'

withDefaults(
  defineProps<{
    dataList: Note[]
    allNotesCount?: number
    deletedNoteCount?: number
    showDelete?: boolean
    showAllNotes?: boolean
    currentNote?: string
    showParentFolder?: boolean
    pressItems?: { type: ItemType }[]
  }>(),
  {
    allNotesCount: 0,
    deletedNoteCount: 0,
    showDelete: false,
    showAllNotes: false,
    currentNote: '',
    showParentFolder: false,
    pressItems: () => [{ type: 'rename' }, { type: 'move' }, { type: 'delete' }],
  },
)

const emit = defineEmits(['refresh', 'update:currentNote', 'selected'])

const listRef = ref<DefineComponent>()
const longPressUUID = ref('')
const longPressMenuOpen = ref(false)

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

function onSelected(uuid: string) {
  emit('update:currentNote', uuid)
  emit('selected', uuid)
}
</script>

<template>
  <IonList ref="listRef" inset>
    <IonAccordionGroup multiple>
      <NoteListItem
        v-if="showAllNotes"
        :data="{
          uuid: 'allnotes',
          title: '全部备忘录',
          type: 'folder',
          puuid: '',
          noteCount: allNotesCount,
        } as Note"
        :class="{ active: currentNote === 'allnotes' }"
        @selected="onSelected('allnotes')"
      />
      <NoteListItem
        v-for="d in dataList"
        :key="d.uuid"
        :data="d"
        :class="{ active: currentNote === d.uuid }"
        :uuid="d.uuid"
        :show-parent-folder
        @selected="onSelected(d.uuid)"
      />
      <NoteListItem
        v-if="showDelete && deletedNoteCount > 0"
        :data="{
          uuid: 'deleted',
          title: '最近删除',
          type: 'folder',
          puuid: '',
          noteCount: deletedNoteCount,
        } as Note"
        :class="{ active: currentNote === 'deleted' }"
        @selected="onSelected('deleted')"
      />
    </IonAccordionGroup>
  </IonList>

  <LongPressMenu
    :is-open="longPressMenuOpen"
    :uuid="longPressUUID"
    :items="pressItems"
    @did-dismiss="() => longPressMenuOpen = false"
    @refresh="$emit('refresh')"
  />
</template>
