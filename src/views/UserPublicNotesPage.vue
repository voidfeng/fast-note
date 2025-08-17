<script setup lang="ts">
import type { Note } from '@/types'
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { alertCircleOutline, folderOutline } from 'ionicons/icons'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NoteList from '@/components/NoteList.vue'
import { useDeviceType } from '@/hooks/useDeviceType'
import { getUserPublicFolders } from '../extensions/supabase/api/noteSharing'
import FolderPage from './FolderPage.vue'
import NoteDetail from './NoteDetail.vue'

const route = useRoute()
const router = useRouter()
const { isDesktop } = useDeviceType()

// 获取路由参数
const userId = computed(() => route.params.userId as string)

// 页面状态
const loading = ref(true)
const error = ref('')
const publicFolders = ref<Note[]>([])
const userInfo = ref<{ id: string, name?: string } | null>(null)
const presentingElement = ref()
const page = ref()

// 状态管理
const state = reactive({
  folderUuid: '',
  noteUuid: '',
})

// 计算属性：按最后修改时间排序的文件夹列表
const sortedFolders = computed(() =>
  publicFolders.value.toSorted((a: Note, b: Note) => {
    const timeA = new Date(a.lastdotime || a.newstime || '').getTime()
    const timeB = new Date(b.lastdotime || b.newstime || '').getTime()
    return timeB - timeA
  }),
)

// 初始化数据
async function init() {
  if (!userId.value) {
    error.value = '无效的用户ID'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = ''

    // 获取用户的公开文件夹
    const folders = await getUserPublicFolders(userId.value)
    publicFolders.value = folders

    // 设置用户信息
    if (folders.length > 0) {
      userInfo.value = {
        id: userId.value,
        name: `用户 ${userId.value.substring(0, 8)}...`,
      }
    }
    else {
      userInfo.value = {
        id: userId.value,
        name: `用户 ${userId.value.substring(0, 8)}...`,
      }
    }
  }
  catch (err) {
    error.value = '加载用户数据失败'
    console.error('加载用户数据失败:', err)
  }
  finally {
    loading.value = false
  }
}

// 刷新数据
async function refresh(ev: CustomEvent) {
  await init()
  ev.detail.complete()
}

onIonViewWillEnter(() => {
  init()
})

onMounted(() => {
  presentingElement.value = page.value.$el
  init()
})
</script>

<template>
  <IonPage ref="page" :class="{ 'note-desktop': isDesktop }">
    <IonHeader>
      <IonToolbar>
        <IonTitle>{{ userInfo?.name || '用户主页' }}</IonTitle>
        <IonButtons slot="start">
          <IonBackButton default-href="/" />
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <IonRefresher slot="fixed" @ion-refresh="refresh($event)">
        <IonRefresherContent />
      </IonRefresher>

      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">
            {{ userInfo?.name || '用户主页' }}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <div v-if="loading" class="loading-container">
        <IonSpinner />
        <p>加载中...</p>
      </div>

      <div v-else-if="error" class="error-container">
        <IonIcon :icon="alertCircleOutline" size="large" />
        <h2>无法加载用户数据</h2>
        <p>{{ error }}</p>
        <IonButton @click="$router.push('/')">
          返回首页
        </IonButton>
      </div>

      <div v-else>
        <!-- 使用NoteList组件显示文件夹列表 -->
        <NoteList
          :note-uuid="state.folderUuid"
          :data-list="sortedFolders"
          :presenting-element="presentingElement"
          :disabled-route="isDesktop"
          @refresh="init"
          @selected="(id: string) => state.folderUuid = id"
        />

        <!-- 空状态 -->
        <div v-if="publicFolders.length === 0" class="empty-state">
          <IonIcon :icon="folderOutline" size="large" />
          <h2>暂无公开文件夹</h2>
          <p>该用户还没有分享任何文件夹</p>
        </div>
      </div>
    </IonContent>

    <!-- 桌面端布局 -->
    <div v-if="isDesktop" class="home-list">
      <FolderPage
        :current-folder="state.folderUuid"
        @selected="(id: string) => state.noteUuid = id"
      />
    </div>
    <div v-if="isDesktop" class="home-detail">
      <NoteDetail :note-uuid="state.noteUuid" />
    </div>
  </IonPage>
</template>

<style lang="scss">
.loading-container,
.error-container,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  gap: 1rem;
  text-align: center;
  color: var(--ion-color-medium);
}

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
</style>
