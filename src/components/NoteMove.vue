<script setup lang="ts">
import type { FolderTreeNode, Note } from '@/types'
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/vue'
import { ref } from 'vue'
import { useNote } from '@/stores'
import { NOTE_TYPE } from '@/types'
import { getTime } from '@/utils/date'
import NoteList from './NoteList.vue'

const props = withDefaults(defineProps<{
  isOpen: boolean
  id: string
}>(), {})

const emit = defineEmits(['refresh'])

const { getFolderTreeByParentId, getNote, updateParentFolderSubcount } = useNote()

const modalRef = ref()
const noteListRef = ref()

const currentNote = ref<Note | null>(null)
const dataList = ref<FolderTreeNode[]>([])

const dismiss = () => modalRef.value.$el.dismiss()

/**
 * 找到包含子文件夹的文件夹 UUID
 * @param notes
 * @returns string[]
 */
function findFoldersWithChildren(notes: FolderTreeNode[]): string[] {
  const ids: string[] = []

  function traverse(node: FolderTreeNode) {
    if (node.children && node.children.length > 0) {
      ids.push(node.originNote.id)
      node.children.forEach(child => traverse(child))
    }
  }

  notes.forEach(node => traverse(node))
  return ids
}

async function onSelected(id: string) {
  if (currentNote.value) {
    currentNote.value.parent_id = id === 'root' ? '' : id
    currentNote.value.updated = getTime()
    updateParentFolderSubcount(currentNote.value)
  }
  dismiss()
  emit('refresh')
}

function onWillPersent() {
  const val = getFolderTreeByParentId()
  // 过滤掉无效的节点
  const validChildren = val ? val.filter(node => node && node.originNote) : []

  dataList.value = [{
    originNote: {
      id: 'root',
      title: '根目录',
      item_type: NOTE_TYPE.FOLDER,
      parent_id: '',
      is_deleted: 0,
      is_locked: 0,
      version: 1,
      updated: getTime(),
      summary: '',
      created: getTime(),
      content: '',
      note_count: 0,
    },
    children: validChildren,
  }]
  const folderIds = findFoldersWithChildren(dataList.value)
  noteListRef.value.setExpandedItems(folderIds)
  currentNote.value = getNote(props.id)
}
</script>

<template>
  <IonModal ref="modalRef" :is-open v-bind="$attrs" @will-present="onWillPersent">
    <IonHeader>
      <IonToolbar>
        <IonTitle>选择文件夹</IonTitle>
        <IonButtons slot="end">
          <IonButton @click="dismiss()">
            取消
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent>
      <NoteList ref="noteListRef" :data-list disabled-route disabled-long-press @selected="onSelected" />
    </IonContent>
  </IonModal>
</template>
