<script setup lang="ts">
import type { AlertButton } from '@ionic/vue'
import type { FolderTreeNode, Note, NoteDetail } from '@/types'
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
import { getUserByUsername, getUserPublicFolderByUsername, getUserPublicFolderContentsByUsername } from '@/extensions/supabase/api/userApi'
import { useDeviceType } from '@/hooks/useDeviceType'
import { useIonicLongPressList } from '@/hooks/useIonicLongPressList'
import { useNote } from '@/hooks/useNote'
import { globalUserCache } from '@/hooks/useUserCache'
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
const { notes, addNote, getNote, getAllFolders, getFolderTreeByPUuid } = useNote()
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
      // 用户公开文件夹上下文
      // 从全局缓存获取用户信息
      let cachedUser = await globalUserCache.getUserFromCache(username.value)

      if (!cachedUser) {
        const user = await getUserByUsername(username.value)
        if (user) {
          cachedUser = {
            id: user.id,
            username: user.username,
            name: user.username || `用户 ${user.username}`,
          }
          await globalUserCache.saveUserToCache(username.value, cachedUser)
        }
      }

      const folderInfo = await getUserPublicFolderByUsername(username.value, uuid, cachedUser?.id)
      if (folderInfo) {
        data.value = folderInfo
      }

      const contents = await getUserPublicFolderContentsByUsername(username.value, uuid, cachedUser?.id)
      folderList.value = contents.map(d => ({ originNote: d })) as FolderTreeNode[]

      // 直接使用数据库中的 subcount，无需计算
    }
    else {
      // 当前用户的文件夹上下文
      const res = await getNote(uuid)
      if (res)
        data.value = res

      folderList.value = getFolderTreeByPUuid(uuid)
      noteList.value = notes.value.filter(d => d.type === 'note' && d.puuid === uuid).map(d => ({ originNote: d })) as FolderTreeNode[]

      if (data.value.uuid === 'allnotes') {
        /**
         * 获取备忘录所属的分类名称
         * 1. 获取所有分类
         * 2. 找到当前备忘录所属的分类
         * 3. 将分类名称赋值给当前备忘录
         */
        const folders = await getAllFolders()
        // 将文件夹数组转换为 Map，以 uuid 为键
        const folderMap = new Map(folders.map(folder => [folder.uuid, folder]))

        // 遍历 dataList，为每个备忘录查找并设置其所属文件夹的名称
        folderList.value.forEach((note) => {
          if (note.originNote.puuid) {
            const parentFolder = folderMap.get(note.originNote.puuid)
            if (parentFolder) {
              note.originNote.folderName = parentFolder.title
            }
            else {
              note.originNote.folderName = '文件夹已删除'
            }
          }
          else {
            note.originNote.folderName = '无文件夹'
          }
        })
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
