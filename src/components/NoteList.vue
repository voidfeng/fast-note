<script setup lang="ts">
import type { DefineComponent, Ref } from 'vue'
import type { ItemType } from '@/components/LongPressMenu.vue'
import type { FolderTreeNode } from '@/types'
import { IonAccordionGroup, IonList } from '@ionic/vue'
import { ref } from 'vue'
import LongPressMenu from '@/components/LongPressMenu.vue'
import { useIonicLongPressList } from '@/hooks/useIonicLongPressList'
import { NOTE_TYPE } from '@/types'
import NoteListItem from './NoteListItem.vue'

const props = withDefaults(
  defineProps<{
    dataList: FolderTreeNode[]
    allNotesCount?: number
    unfiledNotesCount?: number
    deletedNoteCount?: number
    showAllNotes?: boolean
    showUnfiledNotes?: boolean
    showDelete?: boolean
    noteUuid?: string
    showParentFolder?: boolean
    pressItems?: { type: ItemType }[]
    presentingElement?: HTMLElement
    disabledRoute?: boolean
    disabledLongPress?: boolean
  }>(),
  {
    allNotesCount: 0,
    unfiledNotesCount: 0,
    deletedNoteCount: 0,
    showAllNotes: false,
    showUnfiledNotes: false,
    showDelete: false,
    noteUuid: '',
    showParentFolder: false,
    pressItems: () => [{ type: 'rename' }, { type: 'move' }, { type: 'delete' }],
    disabledRoute: false,
    disabledLongPress: false,
  },
)

const emit = defineEmits(['refresh', 'update:noteUuid', 'selected'])

// const { getNote } = useNote()

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
      const id = element.getAttribute('id')
      if (id && !['allnotes', 'deleted', 'unfilednotes'].includes(id)) {
        longPressUUID.value = id
        longPressMenuOpen.value = true
      }
    },
  })
}

function onSelected(id: string) {
  emit('update:noteUuid', id)
  emit('selected', id)
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
    <slot name="header" />
    <IonAccordionGroup :value="expandedItems" multiple @ion-change="(event: CustomEvent) => setExpandedItems(event.detail.value)">
      <NoteListItem
        v-if="showAllNotes"
        :data="{
          originNote: {
            id: 'allnotes',
            title: '全部备忘录',
            item_type: NOTE_TYPE.FOLDER,
            parent_id: '',
            note_count: allNotesCount,
            created: '',
            content: '',
            updated: '',
            is_deleted: 0,
            is_locked: 0,
            summary: '',
          },
          children: [],
        } as FolderTreeNode"
        :class="{ active: noteUuid === 'allnotes' }"
        :disabled-route
        @selected="onSelected('allnotes')"
      />
      <NoteListItem
        v-if="showUnfiledNotes"
        :data="{
          originNote: {
            id: 'unfilednotes',
            title: '备忘录',
            item_type: NOTE_TYPE.FOLDER,
            parent_id: '',
            note_count: unfiledNotesCount,
            created: '',
            content: '',
            updated: '',
            is_deleted: 0,
            is_locked: 0,
            summary: '',
          },
          children: [],
        } as FolderTreeNode"
        :class="{ active: noteUuid === 'allnotes' }"
        :disabled-route
        @selected="onSelected('unfilednotes')"
      />
      <NoteListItem
        v-for="d in dataList"
        :key="d.originNote.id"
        :data="d"
        :class="{ active: noteUuid === d.originNote.id }"
        :show-parent-folder
        :disabled-route
        @selected="onSelected($event)"
      />
      <NoteListItem
        v-if="showDelete && deletedNoteCount > 0"
        :data="{
          originNote: {
            id: 'deleted',
            title: '最近删除',
            item_type: NOTE_TYPE.FOLDER,
            parent_id: '',
            note_count: deletedNoteCount,
            created: '',
            content: '',
            updated: '',
            is_deleted: 0,
            is_locked: 0,
            summary: '',
          },
          children: [],
        } as FolderTreeNode"
        :class="{ active: noteUuid === 'deleted' }"
        :disabled-route
        @selected="onSelected('deleted')"
      />
    </IonAccordionGroup>
  </IonList>

  <LongPressMenu
    :id="longPressUUID"
    :is-open="longPressMenuOpen"
    :items="pressItems"
    :presenting-element
    @did-dismiss="() => longPressMenuOpen = false"
    @refresh="$emit('refresh')"
  />
</template>
