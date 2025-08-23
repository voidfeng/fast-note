<script setup lang="ts">
import type { Note } from '@/types'
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/vue'
import { ref, toRaw, watch } from 'vue'
import { useNote } from '@/hooks/useNote'
import { getTime } from '@/utils/date'
import NoteList from './NoteList.vue'

const props = withDefaults(defineProps<{
  isOpen: boolean
  uuid: string
}>(), {})

const emit = defineEmits(['refresh'])

const { getFolderTreeByPUuid, getNote, updateNote, updateParentFolderSubcount } = useNote()

const modalRef = ref()
const noteListRef = ref()

const currentNote = ref<Note | null>(null)
const dataList = ref<Note[]>([])

const dismiss = () => modalRef.value.$el.dismiss()

/**
 * 找到包含子文件夹的文件夹 UUID
 * @param notes
 * @returns string[]
 */
function findFoldersWithChildren(notes: Note[]): string[] {
  const uuids: string[] = []

  function traverse(note: Note) {
    if (note.children && note.children.length > 0) {
      uuids.push(note.uuid)
      note.children.forEach(child => traverse(child))
    }
  }

  notes.forEach(note => traverse(note))
  return uuids
}

/**
 * 过滤掉与目标 UUID 相等的项
 * @param notes
 * @param targetUuid
 * @returns Note[]
 */
// function filterNotesByUuid(notes: Note[], targetUuid: string): Note[] {
//   return notes.filter((note) => {
//     if (note.uuid === targetUuid) {
//       return false
//     }

//     if (note.children && note.children.length > 0) {
//       note.children = filterNotesByUuid(note.children, targetUuid)
//     }

//     return true
//   })
// }

watch(() => props.isOpen, (val) => {
  if (val) {
    getFolderTreeByPUuid().then(() => {
      dataList.value = [{
        uuid: '',
        title: '根目录',
        type: 'folder',
        puuid: null,
        children: [],
        isdeleted: 0,
        islocked: 0,
        version: 1,
        lastdotime: getTime(),
        smalltext: '',
        newstime: getTime(),
        newstext: '',
        subcount: 0,
      }]
      noteListRef.value.setExpandedItems(findFoldersWithChildren(dataList.value))
      currentNote.value = getNote(props.uuid)
    })
  }
})

async function onSelected(uuid: string) {
  const preNote = Object.assign({}, currentNote.value)
  currentNote.value!.puuid = uuid || null
  currentNote.value!.lastdotime = getTime()
  await updateNote(currentNote.value!.uuid, toRaw(currentNote.value!))
  if (preNote.puuid) {
    updateParentFolderSubcount(preNote)
  }
  if (currentNote.value!.puuid) {
    updateParentFolderSubcount(currentNote.value!)
  }
  dismiss()
  emit('refresh')
}
</script>

<template>
  <IonModal ref="modalRef" :is-open v-bind="$attrs">
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
