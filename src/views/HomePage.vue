<script setup lang="ts">
import {
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
  IonAlert,
  AlertButton,
  onIonViewWillEnter,
} from '@ionic/vue'
import { addOutline, createOutline } from 'ionicons/icons'

import MessageListItem from '@/components/MessageListItem.vue'
import { useNote } from '@/hooks/useNote'
import { Note } from '@/hooks/useDexie'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import FolderPage from './FolderPage.vue'
import NoteDetail from './NoteDetail.vue'

const { addNote, getNotesByUuid, getNoteCountByUuid, onUpdateNote } = useNote()

const dataList = ref<Note[]>([])
const addButtons: AlertButton[] = [
  { text: '取消', role: 'cancel' },
  {
    text: '确认',
    handler: async (d) => {
      await addNote({
        title: d.newFolderName,
        newstime: Date.now(),
        type: 'folder',
        puuid: 0,
      })
    },
  },
]
const state = reactive({
  windowWidth: 0,
  currentFolder: 1,
  currentDetail: 0,
})

const noteDesktop = computed(() => {
  return state.windowWidth >= 640
})

const refresh = (ev: CustomEvent) => {
  setTimeout(() => {
    ev.detail.complete()
  }, 3000)
}

function init() {
  getNotesByUuid('').then(async (res) => {
    dataList.value = res
    for (let i = 0; i < dataList.value.length; i++) {
      const item = dataList.value[i]
      const count = await getNoteCountByUuid(item.uuid!)
      item.noteCount = count
    }
  })
}

init()
onUpdateNote((item) => {
  if (item.puuid === '') {
    init()
  }
})

onIonViewWillEnter(() => {
  init()
})

// 更新窗口宽度的函数
function updateWindowWidth() {
  state.windowWidth = window.innerWidth
}

// 组件挂载时添加监听
onMounted(() => {
  state.windowWidth = window.innerWidth
  window.addEventListener('resize', updateWindowWidth)
})

// 组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener('resize', updateWindowWidth)
})
</script>

<template>
  <ion-page :class="{ 'note-desktop': noteDesktop }">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>备忘录</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">备忘录</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-list>
        <MessageListItem
          v-for="d in dataList"
          :key="d.id"
          :data="d"
          :note-desktop
          :class="{ active: state.currentFolder === d.id }"
          @selected="(id: number) => state.currentFolder = id"
        />
      </ion-list>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button id="add-folder">
            <ion-icon :icon="addOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title></ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/n/0" router-direction="forward">
            <ion-icon :icon="createOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
    <ion-alert
      trigger="add-folder"
      header="请输入文件夹名称"
      :buttons="addButtons"
      :inputs="[{ name: 'newFolderName', placeholder: '请输入文件夹名称' }]"
    />
    <div v-if="noteDesktop" class="home-list">
      <FolderPage
        :current-folder="state.currentFolder"
        @selected="(id: number) => state.currentDetail = id"
      />
    </div>
    <div v-if="noteDesktop" class="home-detail">
      <NoteDetail :current-detail="state.currentDetail" />
    </div>
  </ion-page>
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
