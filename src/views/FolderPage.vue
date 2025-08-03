<script setup lang="ts">
import type { AlertButton } from '@ionic/vue'
import type { Note, NoteDetail } from '@/types'
import {
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewDidEnter,
  onIonViewWillEnter,
} from '@ionic/vue'
import { addOutline, createOutline } from 'ionicons/icons'
import { nanoid } from 'nanoid'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import NoteList from '@/components/NoteList.vue'
import { useDeviceType } from '@/hooks/useDeviceType'
import { useIonicLongPressList } from '@/hooks/useIonicLongPressList'
import { useNote } from '@/hooks/useNote'

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
const { addNote, getNote, getAllFolders, getNotesByPUuid, getNoteCountByUuid } = useNote()
const { isDesktop } = useDeviceType()

const longPressMenuOpen = ref(false)
const longPressUUID = ref('')
const listRef = ref()
useIonicLongPressList(listRef, {
  itemSelector: 'ion-item', // 匹配 ion-item 元素
  duration: 500,
  pressedClass: 'item-long-press',
  onItemLongPress: async (element) => {
    const uuid = element.getAttribute('uuid')
    if (uuid) {
      longPressUUID.value = uuid
      longPressMenuOpen.value = true
    }
  },
})
const data = ref<Note>({} as Note)
const dataList = ref<NoteDetail[]>([])

const state = reactive({
  windowWidth: 0,
  noteUuid: '',
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
  return dataList.value.filter(d => d.type === 'folder')
})

const notes = computed(() => {
  return dataList.value.filter(d => d.type === 'note').sort((a, b) => b.lastdotime - a.lastdotime)
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

watch(
  () => props.currentFolder,
  () => {
    if (props.currentFolder)
      init()
  },
  { immediate: true },
)

function init() {
  let uuid
  if (isDesktop.value)
    uuid = props.currentFolder
  else
    uuid = folderId.value
  if (!uuid)
    return
  getNote(uuid).then((res) => {
    if (res)
      data.value = res
  })

  getNotesByPUuid(uuid).then(async (res) => {
    dataList.value = res
    if (data.value.uuid === 'allnotes') {
      /**
       * 获取备忘录所属的分类名称
       * 1. 获取所有分类
       * 2. 找到当前备忘录所属的分类
       * 3. 将分类名称赋值给当前备忘录
       */
      getAllFolders().then((folders) => {
        // 将文件夹数组转换为 Map，以 uuid 为键
        const folderMap = new Map(folders.map(folder => [folder.uuid, folder]))

        // 遍历 dataList，为每个备忘录查找并设置其所属文件夹的名称
        dataList.value.forEach((note) => {
          if (note.puuid) {
            const parentFolder = folderMap.get(note.puuid)
            if (parentFolder) {
              note.folderName = parentFolder.title
            }
            else {
              note.folderName = '文件夹已删除'
            }
          }
          else {
            note.folderName = '无文件夹'
          }
        })
      })
    }
    else {
      for (let i = 0; i < dataList.value.length; i++) {
        // 计算文件夹下的备忘录数量
        const item = dataList.value[i]
        const count = await getNoteCountByUuid(item.uuid!)
        item.noteCount = count
      }
    }
  })
}

onIonViewWillEnter(() => {
  if (!isDesktop.value)
    init()
})

onIonViewDidEnter(() => {
  if (!isDesktop.value)
    init()
})
</script>

<template>
  <IonPage>
    <IonHeader v-if="!isDesktop" :translucent="true">
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

      <NoteList
        v-model:note-uuid="state.noteUuid"
        :data-list="[...folders, ...notes]"
        :show-parent-folder="data.uuid === 'allnotes'"
        @selected="$emit('selected', $event)"
      />
    </IonContent>
    <IonFooter v-if="!isDesktop">
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
