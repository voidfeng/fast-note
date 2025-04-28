<script setup lang="ts">
import type { Note } from '@/hooks/useDexie'
import type {
  AlertButton,
} from '@ionic/vue'
import NoteList from '@/components/NoteList.vue'
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
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { addOutline, createOutline } from 'ionicons/icons'
import { nanoid } from 'nanoid'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import FolderPage from './FolderPage.vue'
import NoteDetail from './NoteDetail.vue'

const { addNote, onUpdateNote, getDeletedNotes, getFolderTreeByPUuid } = useNote()
const { onSynced } = useSync()
const { isDesktop } = useDeviceType()

const unSub = onSynced(() => {
  init()
  onUnmounted(() => {
    unSub()
  })
})

const page = ref()

const dataList = ref<Note[]>([])
const deletedNotes = ref<Note[]>([])
const allNotesCount = ref(0)
const presentingElement = ref()
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
  currentNote: '',
})

const sortDataList = computed(() => {
  return dataList.value.toSorted((a, b) => {
    if (a.ftitle === 'default-folder' && b.ftitle !== 'default-folder') {
      return -1
    }
    if (a.ftitle !== 'default-folder' && b.ftitle === 'default-folder') {
      return 1
    }
    return b.lastdotime! - a.lastdotime!
  })
})

function refresh(ev: CustomEvent) {
  init().then(() => {
    ev.detail.complete()
  })
}

function init() {
  return new Promise((resolve) => {
    const treePromise = getFolderTreeByPUuid().then((res) => {
      if (res && res.length > 0) {
        dataList.value = res
        // 计算所有笔记总数
        let notesCount = 0
        for (const folder of res) {
          notesCount += folder.noteCount || 0
        }
        allNotesCount.value = notesCount
      }
    })

    // 获取已删除的备忘录
    const deletedPromise = getDeletedNotes().then((res) => {
      deletedNotes.value = res
    })

    // 等待所有Promise完成
    Promise.all([treePromise, deletedPromise]).then(() => {
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

onMounted(() => {
  presentingElement.value = page.value.$el
})
</script>

<template>
  <IonPage ref="page" :class="{ 'note-desktop': isDesktop }">
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

      <NoteList
        v-model:current-note="state.currentNote"
        :data-list="sortDataList"
        :all-notes-count="allNotesCount"
        :deleted-note-count="deletedNotes.length"
        :presenting-element="presentingElement"
        show-delete
        show-all-notes
        @refresh="init"
      />
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
        @selected="(id: string) => state.currentNote = id"
      />
    </div>
    <div v-if="isDesktop" class="home-detail">
      <NoteDetail :current-detail="state.currentNote" />
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
