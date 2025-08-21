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
import { globalUserCache } from '@/hooks/useUserCache'
import { useUserPublicNotes } from '@/hooks/useUserPublicNotes'
import { getUserByUsername, getUserPublicFolderContentsByUsername, getUserPublicFoldersByUsername } from '../extensions/supabase/api/userApi'
import FolderPage from './FolderPage.vue'
import NoteDetail from './NoteDetail.vue'

const route = useRoute()
const router = useRouter()
const { isDesktop } = useDeviceType()

// 获取路由参数
const username = computed(() => route.params.username as string)

// 初始化用户公开笔记存储
const userPublicNotes = useUserPublicNotes(username.value)

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

// 构建树形结构的文件夹列表
const treeStructure = computed(() => {
  if (!publicFolders.value.length)
    return []

  // 创建一个 Map 来存储所有节点
  const nodeMap = new Map<string, Note & { children?: Note[] }>()

  // 首先将所有文件夹添加到 Map 中
  publicFolders.value.forEach((folder) => {
    nodeMap.set(folder.uuid, { ...folder, children: [] })
  })

  // 构建树形结构
  const rootNodes: (Note & { children?: Note[] })[] = []

  publicFolders.value.forEach((folder) => {
    const node = nodeMap.get(folder.uuid)!

    if (!folder.puuid) {
      // 根节点
      rootNodes.push(node)
    }
    else {
      // 子节点
      const parent = nodeMap.get(folder.puuid)
      if (parent) {
        parent.children!.push(node)
      }
      else {
        // 如果找不到父节点，当作根节点处理
        rootNodes.push(node)
      }
    }
  })

  // 递归排序函数
  function sortNodes(nodes: (Note & { children?: Note[] })[]): (Note & { children?: Note[] })[] {
    return nodes
      .sort((a, b) => {
        const timeA = new Date(a.lastdotime || a.newstime || '').getTime()
        const timeB = new Date(b.lastdotime || b.newstime || '').getTime()
        return timeB - timeA
      })
      .map(node => ({
        ...node,
        children: node.children && node.children.length > 0 ? sortNodes(node.children) : undefined,
      }))
  }

  return sortNodes(rootNodes)
})

// 从远程获取数据
async function fetchRemoteData() {
  // 先获取用户信息（只调用一次）
  const user = await getUserByUsername(username.value)
  if (!user) {
    throw new Error('用户不存在')
  }

  // 获取用户的公开文件夹（传入用户ID避免重复查询）
  const folders = await getUserPublicFoldersByUsername(username.value, user.id)

  // 为每个文件夹计算内容数量（传入用户ID避免重复查询）
  const foldersWithCount = await Promise.all(
    folders.map(async (folder) => {
      const contents = await getUserPublicFolderContentsByUsername(username.value, folder.uuid, user.id)
      return {
        ...folder,
        noteCount: contents.length,
      }
    }),
  )

  return { user, foldersWithCount }
}

// 初始化数据
async function init(forceRefresh = false) {
  if (!username.value) {
    error.value = '无效的用户名'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = ''

    // 初始化用户公开笔记存储
    await userPublicNotes.init()

    let shouldFetchRemote = forceRefresh

    if (!forceRefresh) {
      // 检查是否需要更新数据
      shouldFetchRemote = await userPublicNotes.shouldUpdate()
    }

    if (shouldFetchRemote) {
      // 从远程获取数据
      const { user, foldersWithCount } = await fetchRemoteData()

      // 保存到本地数据库
      await userPublicNotes.saveFolders(foldersWithCount)
      await userPublicNotes.saveLastUpdateTime(new Date().toISOString())

      // 保存用户信息到本地数据库
      const userInfoData = {
        id: user.id,
        username: user.username,
        name: user.username || `用户 ${user.username}`,
      }
      await userPublicNotes.saveUserInfo(userInfoData)

      publicFolders.value = foldersWithCount
      userInfo.value = userInfoData
    }
    else {
      // 从本地数据库获取数据
      const localFolders = await userPublicNotes.getLocalFolders()
      const localUserInfo = await userPublicNotes.getUserInfo()

      publicFolders.value = localFolders

      // 优先从全局缓存获取用户信息
      const cachedUser = await globalUserCache.getUserFromCache(username.value)
      if (cachedUser) {
        userInfo.value = {
          id: cachedUser.id,
          name: cachedUser.name || cachedUser.username || `用户 ${cachedUser.username}`,
        }
      }
      else {
        // 如果缓存中没有用户信息，需要获取一次
        const user = await getUserByUsername(username.value)
        if (user) {
          const userInfoData = {
            id: user.id,
            username: user.username,
            name: user.username || `用户 ${user.username}`,
          }
          await globalUserCache.saveUserToCache(username.value, userInfoData)
          userInfo.value = userInfoData
        }
      }
    }
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '加载用户数据失败'
    console.error('加载用户数据失败:', err)
  }
  finally {
    loading.value = false
  }
}

// 刷新数据
async function refresh(ev: CustomEvent) {
  await init(true) // 强制刷新，从远程获取数据
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
        <!-- 使用NoteList组件显示树形文件夹列表 -->
        <NoteList
          :note-uuid="state.folderUuid"
          :data-list="treeStructure"
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
