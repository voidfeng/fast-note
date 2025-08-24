<script setup lang="ts">
import type { FolderTreeNode, Note } from '@/types'
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/vue'
import { ref } from 'vue'
import { useNote } from '@/hooks/useNote'
import { getTime } from '@/utils/date'
import NoteList from './NoteList.vue'

const props = withDefaults(defineProps<{
  isOpen: boolean
  uuid: string
}>(), {})

const emit = defineEmits(['refresh'])

const { getFolderTreeByPUuid, getNote, updateParentFolderSubcount } = useNote()

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
  const uuids: string[] = []

  function traverse(node: FolderTreeNode) {
    if (node.children && node.children.length > 0) {
      uuids.push(node.originNote.uuid)
      node.children.forEach(child => traverse(child))
    }
  }

  notes.forEach(node => traverse(node))
  return uuids
}

async function onSelected(uuid: string) {
  if (currentNote.value) {
    currentNote.value.puuid = uuid === 'root' ? null : uuid
    currentNote.value.lastdotime = getTime()
    updateParentFolderSubcount(currentNote.value)
  }
  // const preNote = Object.assign({}, currentNote.value)
  // currentNote.value!.puuid = uuid || null
  // currentNote.value!.lastdotime = getTime()
  // await updateNote(currentNote.value!.uuid, toRaw(currentNote.value!))
  // if (preNote.puuid) {
  //   updateParentFolderSubcount(preNote)
  // }
  // if (currentNote.value!.puuid) {
  //   updateParentFolderSubcount(currentNote.value!)
  // }
  dismiss()
  emit('refresh')
}

function onWillPersent() {
  const val = getFolderTreeByPUuid()
  // 过滤掉无效的节点
  const validChildren = val ? val.filter(node => node && node.originNote) : []

  dataList.value = [{
    originNote: {
      uuid: 'root',
      title: '根目录',
      type: 'folder',
      puuid: null,
      isdeleted: 0,
      islocked: 0,
      version: 1,
      lastdotime: getTime(),
      smalltext: '',
      newstime: getTime(),
      newstext: '',
      subcount: 0,
    },
    children: validChildren,
  }]
  const folderIds = findFoldersWithChildren(dataList.value)
  noteListRef.value.setExpandedItems(folderIds)
  currentNote.value = getNote(props.uuid)
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
