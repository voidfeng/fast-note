<script setup lang="ts">
import type { ItemType } from '@/components/LongPressMenu.vue'
import type { Note } from '@/hooks/useDexie'
import type { DefineComponent, Ref } from 'vue'
import LongPressMenu from '@/components/LongPressMenu.vue'
import { useIonicLongPressList } from '@/hooks/useIonicLongPressList'
import { useNote } from '@/hooks/useNote'
import { IonAccordionGroup, IonList } from '@ionic/vue'
import { ref } from 'vue'
import NoteListItem from './NoteListItem.vue'

const props = withDefaults(
  defineProps<{
    dataList: Note[]
    allNotesCount?: number
    deletedNoteCount?: number
    showDelete?: boolean
    showAllNotes?: boolean
    currentNote?: string
    showParentFolder?: boolean
    pressItems?: { type: ItemType }[]
    presentingElement?: HTMLElement
    disabledRoute?: boolean
    disabledLongPress?: boolean
  }>(),
  {
    allNotesCount: 0,
    deletedNoteCount: 0,
    showDelete: false,
    showAllNotes: false,
    currentNote: '',
    showParentFolder: false,
    pressItems: () => [{ type: 'rename' }, { type: 'move' }, { type: 'delete' }],
    disabledRoute: false,
    disabledLongPress: false,
  },
)

const emit = defineEmits(['refresh', 'update:currentNote', 'selected'])

const { getNote } = useNote()

const listRef = ref<DefineComponent>()
const longPressUUID = ref('')
const longPressMenuOpen = ref(false)
const expandedItems = ref<string[]>([])

if (!props.disabledLongPress) {
  useIonicLongPressList(listRef as Ref<DefineComponent>, {
    itemSelector: 'ion-item', // 匹配 ion-item 元素
    duration: 500,
    pressedClass: 'item-long-press',
    onItemLongPress: async (element) => {
      const uuid = element.getAttribute('uuid')
      const note = await getNote(`${uuid}`)
      if (uuid && !['allnotes', 'deleted'].includes(uuid) && note?.ftitle !== 'default-folder') {
        longPressUUID.value = uuid
        longPressMenuOpen.value = true
      }
    },
  })
}

function onSelected(uuid: string) {
  emit('update:currentNote', uuid)
  emit('selected', uuid)
}

function setExpandedItems(items: string[]) {
  expandedItems.value = items
}

defineExpose({
  setExpandedItems,
})
</script>

<template>
  <IonList ref="listRef" inset>
    <IonAccordionGroup :value="expandedItems" multiple>
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
        :disabled-route
        @selected="onSelected('allnotes')"
      />
      <NoteListItem
        v-for="d in dataList"
        :key="d.uuid"
        :data="d"
        :class="{ active: currentNote === d.uuid }"
        :uuid="d.uuid"
        :show-parent-folder
        :disabled-route
        @selected="onSelected($event)"
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
        :disabled-route
        @selected="onSelected('deleted')"
      />
    </IonAccordionGroup>
  </IonList>

  <LongPressMenu
    :is-open="longPressMenuOpen"
    :uuid="longPressUUID"
    :items="pressItems"
    :presenting-element
    @did-dismiss="() => longPressMenuOpen = false"
    @refresh="$emit('refresh')"
  />
</template>
