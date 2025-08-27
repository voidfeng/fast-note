<script setup lang="ts">
import type { AlertButton } from '@ionic/vue'
import type { FolderTreeNode, Note } from '@/types'
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
import { useNote, useUserPublicNotes } from '@/stores'
import { getTime } from '@/utils/date'

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
const { notes, addNote, getNote, getFolderTreeByPUuid } = useNote()
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
const folderList = ref<FolderTreeNode[]>([])
const noteList = ref<FolderTreeNode[]>([])

const state = reactive({
  windowWidth: 0,
  noteUuid: '',
})

const folderId = computed(() => {
  const path = route.path
  const lastId = path.split('/')
  return lastId[lastId.length - 1]
})

const username = computed(() => route.params.username as string)
const isUserContext = computed(() => !!username.value)

const addButtons: AlertButton[] = [
  { text: '取消', role: 'cancel' },
  {
    text: '确认',
    handler: async (d) => {
      const isoTime = getTime()
      await addNote({
        title: d.newFolderName,
        newstime: getTime(),
        lastdotime: isoTime,
        type: 'folder',
        puuid: folderId.value || null,
        uuid: nanoid(12),
        version: 1,
        newstext: '',
        isdeleted: 0,
        islocked: 0,
        subcount: 0,
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
  return folderList.value
})

const defaultHref = computed(() => {
  /**
   * 返回上一级逻辑：当前url去掉最后一个id
   * 例如:  /f/12/13 返回 /f/12
   * 例如2: /f/12  返回 /home
   * 用户上下文: /:username/f/12 返回 /:username
   */
  const path = route.path
  const lastId = path.split('/').pop()
  const newPath = path.replace(`/${lastId}`, '')

  if (isUserContext.value && isTopFolder.value) {
    return `/${username.value}`
  }
  else if (isTopFolder.value) {
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

async function init() {
  let uuid
  if (isDesktop.value)
    uuid = props.currentFolder
  else
    uuid = folderId.value
  if (!uuid)
    return

  try {
    if (isUserContext.value) {
      const { publicNotes, getPublicFolderTreeByPUuid, getPublicNote } = useUserPublicNotes(username.value)

      // 用户公开文件夹上下文
      const folderInfo = getPublicNote(uuid)
      if (folderInfo) {
        data.value = folderInfo
      }

      folderList.value = getPublicFolderTreeByPUuid(uuid)
      if (publicNotes.value)
        noteList.value = publicNotes.value.filter(d => d.type === 'note' && d.puuid === uuid).map(d => ({ originNote: d })) as FolderTreeNode[]

      // 直接使用数据库中的 subcount，无需计算
    }
    else {
      // 当前用户的文件夹上下文
      const res = await getNote(uuid)
      if (res)
        data.value = res

      if (uuid === 'allnotes') {
        data.value = { uuid: 'allnotes' } as Note
        /**
         * 获取备忘录所属的分类名称
         * 1. 获取所有分类
         * 2. 找到当前备忘录所属的分类
         * 3. 将分类名称赋值给当前备忘录
         */
        const allNotes = notes.value.filter(d => d.type === 'note').map(d => ({ originNote: d })) as FolderTreeNode[]
        const allFolders = notes.value.filter(d => d.type === 'folder')
        // 将文件夹数组转换为 Map，以 uuid 为键
        const folderMap = new Map(allFolders.map(folder => [folder.uuid, folder]))

        // 遍历 dataList，为每个备忘录查找并设置其所属文件夹的名称
        allNotes.forEach((note) => {
          if (note.originNote.puuid) {
            const parentFolder = folderMap.get(note.originNote.puuid)
            if (parentFolder) {
              note.folderName = parentFolder.title
            }
            else {
              note.folderName = '备忘录'
            }
          }
          else {
            note.folderName = '备忘录'
          }
        })
        noteList.value = allNotes
      }
      else if (uuid === 'unfilednotes') {
        data.value = { uuid: 'unfilednotes' } as Note
        noteList.value = notes.value.filter(d => d.type === 'note' && !d.puuid).map(d => ({ originNote: d })) as FolderTreeNode[]
      }
      else {
        folderList.value = getFolderTreeByPUuid(uuid)
        noteList.value = notes.value.filter(d => d.type === 'note' && d.puuid === uuid).map(d => ({ originNote: d })) as FolderTreeNode[]
      }
    }
  }
  catch (error) {
    console.error('初始化文件夹数据失败:', error)
  }
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
        :data-list="[...folders, ...noteList]"
        :show-parent-folder="data.uuid === 'allnotes'"
        @selected="$emit('selected', $event)"
      />
    </IonContent>
    <IonFooter v-if="!isDesktop">
      <IonToolbar>
        <IonButtons v-if="data.uuid !== 'allnotes' && !isUserContext" slot="start">
          <IonButton id="add-folder2">
            <IonIcon :icon="addOutline" />
          </IonButton>
        </IonButtons>
        <IonTitle>
          {{ folders.length > 0 ? `${folders.length}个文件夹 ·` : '' }}
          {{ notes.length > 0 ? `${notes.length}个备忘录` : '无备忘录' }}
        </IonTitle>
        <IonButtons v-if="data.uuid !== 'allnotes' && !isUserContext" slot="end">
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
