<script setup lang="ts">
import type {
  AlertButton,
} from '@ionic/vue'
import type { Note } from '@/types'
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
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import DarkModeToggle from '@/components/DarkModeToggle.vue'
import ExtensionButton from '@/components/ExtensionButton.vue'
import ExtensionManager from '@/components/ExtensionManager.vue'
import ExtensionRenderer from '@/components/ExtensionRenderer.vue'
import GlobalSearch from '@/components/GlobalSearch/GlobalSearch.vue'
import { useGlobalSearch } from '@/components/GlobalSearch/useGlobalSearch'
import NoteList from '@/components/NoteList.vue'
import { useDeviceType } from '@/hooks/useDeviceType'
import { useExtensions } from '@/hooks/useExtensions'
import { useNote } from '@/hooks/useNote'
import { getTime } from '@/utils/date'
import { errorHandler, ErrorType, withErrorHandling } from '@/utils/errorHandler'
import FolderPage from './FolderPage.vue'
import NoteDetail from './NoteDetail.vue'

const { addNote, onUpdateNote, getDeletedNotes, getFolderTreeByPUuid, getUnfiledNotesCount } = useNote()
const { isDesktop } = useDeviceType()
const { showGlobalSearch } = useGlobalSearch()
const { isExtensionEnabled, getExtensionModule } = useExtensions()

// 扩展管理器状态
const showExtensionManager = ref(false)

// 动态获取同步扩展的钩子函数
let unSub: (() => void) | undefined

// 监听同步扩展的加载状态
watch(() => isExtensionEnabled('sync'), async (enabled) => {
  if (enabled) {
    // 如果同步扩展已启用，动态获取其钩子函数
    const syncModule = getExtensionModule('sync')
    if (syncModule && syncModule.useSync) {
      const { onSynced } = syncModule.useSync()
      unSub = onSynced(() => {
        init()
      })
    }
  }
  else if (unSub) {
    // 如果同步扩展被禁用，取消订阅
    unSub()
    unSub = undefined
  }
}, { immediate: true })

// 在组件卸载时取消订阅
onUnmounted(() => {
  if (unSub) {
    unSub()
  }
})

const page = ref()

const dataList = ref<Note[]>([])
const allNotesCount = ref(0)
const unfiledNotesCount = ref(0)
const deletedNotes = ref<Note[]>([])
const presentingElement = ref()
const addButtons: AlertButton[] = [
  { text: '取消', role: 'cancel' },
  {
    text: '确认',
    handler: async (d) => {
      const isoTime = getTime()
      await addNote({
        title: d.newFolderName,
        newstime: getTime(),
        newstext: '',
        lastdotime: isoTime,
        type: 'folder',
        puuid: null,
        uuid: nanoid(12),
        subcount: 0,
        isdeleted: 0,
        islocked: 0,
      })
      init()
    },
  },
]
const state = reactive({
  windowWidth: 0,
  folerUuid: '',
  noteUuid: '',
})

const sortDataList = computed(() => dataList.value.toSorted((a: Note, b: Note) => new Date(b.lastdotime!).getTime() - new Date(a.lastdotime!).getTime()))

async function refresh(ev: CustomEvent) {
  await init()
  ev.detail.complete()
}

async function init() {
  // 获取文件夹树数据
  const { data: treeData, error: treeError } = await withErrorHandling(
    () => getFolderTreeByPUuid(),
    ErrorType.DATABASE,
  )

  unfiledNotesCount.value = getUnfiledNotesCount()

  if (treeError) {
    console.error('获取文件夹数据失败:', errorHandler.getUserFriendlyMessage(treeError))
  }
  else if (treeData && treeData.length > 0) {
    dataList.value = treeData
    // 直接使用 subcount，无需计算
    allNotesCount.value = dataList.value.reduce((acc, cur) => acc + cur.subcount!, 0) + unfiledNotesCount.value
  }

  // 获取已删除的备忘录
  const { data: deletedData, error: deletedError } = await withErrorHandling(
    () => getDeletedNotes(),
    ErrorType.DATABASE,
  )

  if (deletedError) {
    console.error('获取已删除笔记失败:', errorHandler.getUserFriendlyMessage(deletedError))
  }
  else if (deletedData) {
    deletedNotes.value = deletedData
  }
}

onUpdateNote((item) => {
  if (item.puuid === null) {
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
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 16px;">
          <div class="flex items-center space-x-2">
            <!-- 使用扩展渲染器动态渲染同步组件 -->
            <ExtensionRenderer
              extension-id="sync"
              component-name="SyncState"
              :component-props="{}"
            />
            <!-- 使用扩展渲染器动态渲染 Supabase 用户信息组件 -->
            <ExtensionRenderer
              extension-id="supabase"
              component-name="UserProfile"
              :component-props="{}"
            />
          </div>
          <div class="flex items-center">
            <ExtensionButton @click="showExtensionManager = true" />
            <DarkModeToggle />
          </div>
        </div>
      </IonHeader>

      <GlobalSearch />

      <NoteList
        :note-uuid="state.folerUuid"
        :data-list="sortDataList"
        :all-notes-count
        :unfiled-notes-count
        :deleted-note-count="deletedNotes.length"
        :presenting-element="presentingElement"
        :disabled-route="isDesktop"
        show-all-notes
        show-unfiled-notes
        show-delete
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

    <!-- 扩展管理器 -->
    <ExtensionManager
      v-model:is-open="showExtensionManager"
      :presenting-element="presentingElement"
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
