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
import { useCategory } from '@/hooks/useCategory'
import { Category } from '@/hooks/useDexie'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

const { addCategory, getCategorysByPid, getNoteCountByPid, onUpdateCategory } = useCategory()

const dataList = ref<Category[]>([])
const addButtons: AlertButton[] = [
  { text: '取消', role: 'cancel' },
  {
    text: '确认',
    handler: async (d) => {
      await addCategory({
        title: d.newFolderName,
        newstime: Date.now(),
        type: 'folder',
        pid: 0,
      })
    },
  },
]
const state = reactive({
  windowWidth: 0,
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
  getCategorysByPid(0).then(async (res) => {
    dataList.value = res
    for (let i = 0; i < dataList.value.length; i++) {
      const item = dataList.value[i]
      const count = await getNoteCountByPid(item.id!)
      item.noteCount = count
    }
  })
}

init()
onUpdateCategory((item) => {
  if (item.pid === 0) {
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
        <MessageListItem v-for="d in dataList" :key="d.id" :data="d" />
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
  </ion-page>
</template>

<style lang="scss">
.ion-page {
  .note-desktop {
    right: initial;
    width: 33%;
    border-right: 1px solid #333;
  }
}
</style>
