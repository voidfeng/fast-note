<script setup lang="ts">
import type { Note } from '@/hooks/useDexie'
import type {
  AlertButton,
} from '@ionic/vue'
import MessageListItem from '@/components/MessageListItem.vue'

import SyncState from '@/components/SyncState.vue'
import { useDeviceType } from '@/hooks/useDeviceType'
import { useNote } from '@/hooks/useNote'
import { useSync } from '@/hooks/useSync'
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { addOutline, createOutline } from 'ionicons/icons'
import { nanoid } from 'nanoid'
import { onUnmounted, reactive, ref } from 'vue'
import FolderPage from './FolderPage.vue'
import NoteDetail from './NoteDetail.vue'

const { addNote, getNotesByPUuid, getNoteCountByUuid, onUpdateNote, getDeletedNotes } = useNote()
const { onSynced } = useSync()
const { isDesktop } = useDeviceType()
const unSub = onSynced(() => {
  init()
  onUnmounted(() => {
    unSub()
  })
})

const dataList = ref<Note[]>([])
const deletedNotes = ref<Note[]>([])
const allNotesCount = ref(0)
const addButtons: AlertButton[] = [
  { text: '取消', role: 'cancel' },
  {
    text: '确认',
    handler: async (d) => {
      const time = Math.floor(Date.now() / 1000)
      await addNote({
        title: d.newFolderName,
        newstime: time,
        lastdotime: time,
        type: 'folder',
        puuid: '',
        uuid: nanoid(12),
        version: 1,
      })
    },
  },
]
const state = reactive({
  windowWidth: 0,
  currentFolder: '',
  currentDetail: '',
})

function refresh(ev: CustomEvent) {
  init().then(() => {
    ev.detail.complete()
  })
}

function init() {
  return new Promise((resolve) => {
    const a = getNotesByPUuid('').then(async (res) => {
      dataList.value = res
      let notesCount = 0
      for (let i = 0; i < dataList.value.length; i++) {
        const item = dataList.value[i]
        const count = await getNoteCountByUuid(item.uuid!)
        item.noteCount = count
        notesCount += item.noteCount!
      }
      allNotesCount.value = notesCount
    })
    // 获取已删除的备忘录
    const b = getDeletedNotes().then((res) => {
      deletedNotes.value = res
    })
    Promise.all([a, b]).then(() => {
      resolve(true)
    })
  })
}

onUpdateNote((item) => {
  if (item.puuid === '') {
    init()
  }
})

onIonViewWillEnter(() => {
  init()
})
</script>

<template>
  <IonPage :class="{ 'note-desktop': isDesktop }">
    <IonHeader :translucent="true">
      <IonToolbar />
    </IonHeader>

    <IonContent :fullscreen="true">
      <IonRefresher slot="fixed" @ion-refresh="refresh($event)">
        <IonRefresherContent />
      </IonRefresher>

      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">
            备忘录
          </IonTitle>
        </IonToolbar>
        <SyncState />
      </IonHeader>

      <IonList>
        <MessageListItem
          :data="{
            uuid: 'allnotes',
            title: '全部备忘录',
            type: 'folder',
            puuid: '',
            noteCount: allNotesCount,
          } as Note"
          :note-desktop="isDesktop"
          :class="{ active: state.currentFolder === 'allnotes' }"
          @selected="(uuid: string) => state.currentFolder = uuid"
        />
        <MessageListItem
          v-for="d in dataList"
          :key="d.uuid"
          :data="d"
          :note-desktop="isDesktop"
          :class="{ active: state.currentFolder === d.uuid }"
          @selected="(uuid: string) => state.currentFolder = uuid"
        />
        <MessageListItem
          v-if="deletedNotes.length > 0"
          :data="{
            uuid: 'deleted',
            title: '最近删除',
            type: 'folder',
            puuid: '',
            noteCount: deletedNotes.length,
          } as Note"
          :note-desktop="isDesktop"
          :class="{ active: state.currentFolder === 'deleted' }"
          @selected="(uuid: string) => state.currentFolder = uuid"
        />
      </IonList>
    </IonContent>
    <IonFooter>
      <IonToolbar>
        <IonButtons slot="start">
          <IonButton id="add-folder">
            <IonIcon :icon="addOutline" />
          </IonButton>
        </IonButtons>
        <IonTitle />
        <IonButtons slot="end">
          <IonButton router-link="/n/0" router-direction="forward">
            <IonIcon :icon="createOutline" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonFooter>
    <IonAlert
      trigger="add-folder"
      header="请输入文件夹名称"
      :buttons="addButtons"
      :inputs="[{ name: 'newFolderName', placeholder: '请输入文件夹名称' }]"
    />
    <div v-if="isDesktop" class="home-list">
      <FolderPage
        :current-folder="state.currentFolder"
        @selected="(id: string) => state.currentDetail = id"
      />
    </div>
    <div v-if="isDesktop" class="home-detail">
      <NoteDetail :current-detail="state.currentDetail" />
    </div>
  </IonPage>
</template>

<style lang="scss">
.ion-page {
  .note-desktop {
    right: initial;
    width: 33.33333%;
    border-right: 1px solid #333;
  }
  .home-list {
    position: absolute;
    left: calc(100% + 1px);
    width: 100%;
    height: 100%;
    border-right: 1px solid #333;
  }
  .home-detail {
    position: absolute;
    left: calc(200% + 1px);
    width: calc(100% + 2px);
    height: 100%;
  }
}
</style>
