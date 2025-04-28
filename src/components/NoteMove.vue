<script setup lang="ts">
import type { Note } from '@/hooks/useDexie'
import { useNote } from '@/hooks/useNote'
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/vue'
import { ref, watch } from 'vue'
import NoteList from './NoteList.vue'

const props = withDefaults(defineProps<{
  isOpen: boolean
}>(), {})

const { getFolderTreeByPUuid } = useNote()

const modal = ref()
const dataList = ref<Note[]>([])

const dismiss = () => modal.value.$el.dismiss()

watch(() => props.isOpen, (val) => {
  if (val) {
    getFolderTreeByPUuid().then((res) => {
      dataList.value = res
    })
  }
})

function onSelected(uuid: string) {
  console.log(uuid)
}
</script>

<template>
  <IonModal ref="modal" :is-open v-bind="$attrs">
    <IonHeader>
      <IonToolbar>
        <IonTitle>Modal</IonTitle>
        <IonButtons slot="end">
          <IonButton @click="dismiss()">
            Close
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent>
      <NoteList :data-list disabled-route disabled-long-press @selected="onSelected" />
    </IonContent>
  </IonModal>
</template>
