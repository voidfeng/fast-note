<script setup lang="ts">
import type {
  AlertButton,
} from '@ionic/vue'
import type { Note } from '@/hooks/useDexie'
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
import GlobalSearch from '@/components/GlobalSearch/GlobalSearch.vue'
import { useGlobalSearch } from '@/components/GlobalSearch/useGlobalSearch'
import NoteList from '@/components/NoteList.vue'
import SyncState from '@/components/SyncState.vue'
import { useDeviceType } from '@/hooks/useDeviceType'
import { useNote } from '@/hooks/useNote'
import { useSync } from '@/hooks/useSync'
import FolderPage from './FolderPage.vue'
import NoteDetail from './NoteDetail.vue'

const { addNote, onUpdateNote, getDeletedNotes, getFolderTreeByPUuid } = useNote()
const { onSynced } = useSync()
const { isDesktop } = useDeviceType()
const { showGlobalSearch } = useGlobalSearch()

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
  folerUuid: '',
  noteUuid: '',
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
    <Transition name="header-slide">
      <IonHeader v-if="!showGlobalSearch" :translucent="true">
        <IonToolbar />
      </IonHeader>
    </Transition>

    <IonContent :fullscreen="true">
      <IonRefresher v-if="!showGlobalSearch" slot="fixed" @ion-refresh="refresh($event)">
        <IonRefresherContent />
      </IonRefresher>

      <IonHeader collapse="condense">
        <IonToolbar>
          <Transition name="header-slide">
            <IonTitle v-if="!showGlobalSearch" size="large">
              备忘录
            </IonTitle>
          </Transition>
        </IonToolbar>
        <SyncState />
      </IonHeader>

      <GlobalSearch />

      <NoteList
        v-model:current-note="state.noteUuid"
        :data-list="sortDataList"
        :all-notes-count="allNotesCount"
        :deleted-note-count="deletedNotes.length"
        :presenting-element="presentingElement"
        show-delete
        show-all-notes
        @refresh="init"
        @selected="(id: string) => state.folerUuid = id"
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
        :current-folder="state.folerUuid"
        @selected="(id: string) => state.noteUuid = id"
      />
    </div>
    <div v-if="isDesktop" class="home-detail">
      <NoteDetail :note-uuid="state.noteUuid" />
    </div>
  </IonPage>
</template>

<style lang="scss">
.ion-page {
  .note-desktop {
    right: initial;
    width: 361px;
    border-right: 1px solid #333;
    .home-list {
      width: 361px;
      border-right: 1px solid #333;
      left: 361px;
    }
    .home-detail {
      width: calc(100vw - 361px * 2);
      left: 722px;
    }
  }
  .home-list,
  .home-detail {
    position: fixed;
    height: 100%;
  }
}
/* 进入和离开动画的激活状态 */
.header-slide-enter-active,
.header-slide-leave-active {
  transition:
    max-height 0.3s ease-in-out,
    opacity 0.3s ease-in-out;
  overflow: hidden; /* 非常重要！确保内容在折叠时被裁剪 */
}

/* 进入动画的起始状态 和 离开动画的结束状态 */
.header-slide-enter-from,
.header-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* 进入动画的结束状态 和 离开动画的起始状态 */
.header-slide-enter-to,
.header-slide-leave-from {
  /*
    设置一个足够大的 max-height 值，使其能容纳 header 的所有内容。
    一个标准的 ion-toolbar 大约是 56px。
    如果你的 header 内容更多（例如，多个 toolbar，大标题模式），请增大此值。
    例如: 100px, 150px, 或根据你的 header 实际最大高度调整。
  */
  max-height: 150px; /* 示例值，请根据你的 header 内容调整 */
  opacity: 1;
}
</style>
