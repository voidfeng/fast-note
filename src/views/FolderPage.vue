<script setup lang="ts">
import type { Note } from '@/hooks/useDexie'
import type {
  AlertButton,
} from '@ionic/vue'
import MessageListItem from '@/components/MessageListItem.vue'

import { useNote } from '@/hooks/useNote'
import {
  IonAlert,
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
  onIonViewWillEnter,
} from '@ionic/vue'
import { addOutline, createOutline } from 'ionicons/icons'
import { nanoid } from 'nanoid'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const props = withDefaults(
  defineProps<{
    currentFolder?: string
  }>(),
  {
    currentFolder: undefined,
  },
)

defineEmits(['selected'])

const route = useRoute()
const { addNote, getNote, getNotesByPUuid, getNoteCountByUuid } = useNote()

const data = ref<Note>({} as Note)
const dataList = ref<Note[]>([])

const state = reactive({
  windowWidth: 0,
  currentDetail: '',
})

const folderId = computed(() => {
  const path = route.path
  const lastId = path.split('/')
  return lastId[lastId.length - 1]
})

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
        puuid: folderId.value,
        uuid: nanoid(12),
        version: 1,
      })
      init(folderId.value)
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
  return dataList.value.filter(d => d.type === 'folder')
})

const notes = computed(() => {
  return dataList.value.filter(d => d.type === 'note')
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

const noteDesktop = computed(() => {
  return state.windowWidth >= 640
})

watch(
  () => props.currentFolder,
  () => {
    if (props.currentFolder)
      init(props.currentFolder)
  },
  { immediate: true },
)

function init(uuid: string) {
  getNote(uuid).then((res) => {
    if (res)
      data.value = res
  })

  getNotesByPUuid(uuid).then(async (res) => {
    dataList.value = res

    for (let i = 0; i < dataList.value.length; i++) {
      const item = dataList.value[i]
      const count = await getNoteCountByUuid(item.uuid!)
      item.noteCount = count
    }
  })
}

onIonViewWillEnter(() => {
  if (!noteDesktop.value)
    init(folderId.value)
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
  <IonPage>
    <IonHeader v-if="!noteDesktop" :translucent="true">
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton :text="isTopFolder ? '备忘录' : '返回'" :default-href="defaultHref" />
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">
            {{ data.title }}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonList>
        <MessageListItem
          v-for="d in dataList"
          :key="d.uuid"
          :data="d"
          :note-desktop
          :class="{ active: state.currentDetail === d.uuid }"
          @selected="(uuid: string) => {
            state.currentDetail = uuid
            $emit('selected', uuid)
          }"
        />
      </IonList>
    </IonContent>
    <IonFooter v-if="!noteDesktop">
      <IonToolbar>
        <IonButtons v-if="data.uuid !== 'allnotes'" slot="start">
          <IonButton id="add-folder2">
            <IonIcon :icon="addOutline" />
          </IonButton>
        </IonButtons>
        <IonTitle>
          {{ folders.length > 0 ? `${folders.length}个文件夹 ·` : '' }}
          {{ notes.length > 0 ? `${notes.length}个备忘录` : '无备忘录' }}
        </IonTitle>
        <IonButtons v-if="data.uuid !== 'allnotes'" slot="end">
          <IonButton :router-link="`/n/0?puuid=${folderId}`" router-direction="forward">
            <IonIcon :icon="createOutline" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonFooter>
    <IonAlert
      trigger="add-folder2"
      header="请输入文件夹名称"
      :buttons="addButtons"
      :inputs="[{ name: 'newFolderName', placeholder: '请输入文件夹名称' }]"
    />
  </IonPage>
</template>
