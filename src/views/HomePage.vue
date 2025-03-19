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
} from '@ionic/vue'
import { addOutline, createOutline } from 'ionicons/icons';

import MessageListItem from '@/components/MessageListItem.vue'
import { useCategory } from '@/hooks/useCategory'
import { Category } from '@/hooks/useDexie';
import { ref } from 'vue';

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

const refresh = (ev: CustomEvent) => {
  setTimeout(() => {
    ev.detail.complete()
  }, 3000)
}

function init() {
  getCategorysByPid(0).then(async (res) => {
    dataList.value = res
    for (let i = 0; i < dataList.value.length; i++) {
      const item = dataList.value[i];
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
</script>

<template>
  <ion-page>
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
