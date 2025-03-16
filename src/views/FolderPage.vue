<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  IonAlert,
  AlertButton,
  onIonViewWillEnter,
} from '@ionic/vue'
import { addOutline, createOutline } from 'ionicons/icons'

import MessageListItem from '@/components/MessageListItem.vue'
import { useCategory } from '@/hooks/useCategory'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Category } from '@/hooks/useDexie'

const route = useRoute()
const { addCategory, getCategory, getCategorysByPid, getNoteCountByPid } = useCategory()

const data = ref<Category>({} as Category)
const dataList = ref<Category[]>([])

const folderId = computed(() => {
  const path = route.path
  const lastId = path.split('/')
  return parseInt(lastId[lastId.length - 1], 10)
})

const addButtons: AlertButton[] = [
  { text: '取消', role: 'cancel' },
  {
    text: '确认',
    handler: async (d) => {
      await addCategory({
        title: d.newFolderName,
        newstime: Date.now(),
        type: 'folder',
        pid: folderId.value,
      })
      init()
    },
  },
]

const isTopFolder = computed(() => {
  const path = route.path
  const lastId = path.split('/')
  lastId.pop()
  return !/^\d+$/.test(lastId[lastId.length - 1])
})

const folders = computed(() => {
  return dataList.value.filter((d) => d.type === 'folder')
})

const notes = computed(() => {
  return dataList.value.filter((d) => d.type === 'note')
})

const defaultHref = computed(() => {
  /**
   * 返回上一级逻辑：当前url去掉最后一个id
   * 例如:  /f/12/13 返回 /f/12
   * 例如2: /f/12  返回 /home
   */
  const path = route.path
  const lastId = path.split('/').pop()
  const newPath = path.replace(`/${lastId}`, '')
  if (isTopFolder.value) {
    return '/home'
  }
  return newPath
})

function init() {
  getCategory(folderId.value).then((res) => {
    if (res) data.value = res
  })

  getCategorysByPid(folderId.value).then(async (res) => {
    dataList.value = res

    for (let i = 0; i < dataList.value.length; i++) {
      const item = dataList.value[i]
      const count = await getNoteCountByPid(item.id!)
      item.noteCount = count
    }
  })
}

onIonViewWillEnter(() => {
  init()
})
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :text="isTopFolder ? '备忘录' : '返回'" :default-href="defaultHref" />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ data.title }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-list>
        <MessageListItem v-for="d in dataList" :key="d.id" :data="d" />
      </ion-list>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button id="add-folder2">
            <ion-icon :icon="addOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>
          {{ folders.length > 0 ? `${folders.length}个文件夹 ·` : '' }}
          {{ notes.length > 0 ? `${notes.length}个备忘录` : '无备忘录' }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button :router-link="`/n/0?pid=${folderId}`" router-direction="forward">
            <ion-icon :icon="createOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
    <ion-alert
      trigger="add-folder2"
      header="请输入文件夹名称"
      :buttons="addButtons"
      :inputs="[{ name: 'newFolderName', placeholder: '请输入文件夹名称' }]"
    />
  </ion-page>
</template>
