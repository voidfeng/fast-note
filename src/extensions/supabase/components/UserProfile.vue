<script setup lang="ts">
import type { FileRef, Note, TypedFile } from '@/types'
import {
  alertController,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonRow,
  IonTitle,
  IonToolbar,
  loadingController,
  useIonRouter,
} from '@ionic/vue'
import {
  closeOutline,
  cloudDownloadOutline,
  documentTextOutline,
  folderOutline,
  linkOutline,
  logInOutline,
  logOutOutline,
  personCircleOutline,
  refreshOutline,
  syncOutline,
  trashOutline,
} from 'ionicons/icons'
import { computed, onMounted, ref } from 'vue'
import { useDexie } from '@/hooks/useDexie'
import { useAuth } from '../hooks/useAuth'
import { useData } from '../hooks/useData'
import { useSync } from '../hooks/useSync'

const router = useIonRouter()
const { init: initDexie } = useDexie()
const { currentUser, logout, isLoggedIn } = useAuth()
const { getUserNotes, getUserFiles, getUserFileRefs } = useData()
const { syncStatus, bidirectionalSync, getLocalDataStats, clearLocalData } = useSync()

// 弹窗控制
const isModalOpen = ref(false)

// 用户数据
const userNotes = ref<Note[]>([])
const userFiles = ref<TypedFile[]>([])
const userFileRefs = ref<FileRef[]>([])
const isLoading = ref(false)

// 本地数据统计
const localStats = ref({ notes: 0, files: 0, fileRefs: 0 })

// 统计数据
const stats = computed(() => ({
  notesCount: userNotes.value.length,
  filesCount: userFiles.value.length,
  fileRefsCount: userFileRefs.value.length,
}))

function handleLogin() {
  router.push('/supabase/login')
}

async function handleUserProfile() {
  isModalOpen.value = true
  await loadUserData()
}

async function loadUserData() {
  if (!isLoggedIn.value)
    return

  isLoading.value = true
  try {
    const [notes, files, fileRefs, localData] = await Promise.all([
      getUserNotes(),
      getUserFiles(),
      getUserFileRefs(),
      getLocalDataStats(),
    ])

    userNotes.value = notes || []
    userFiles.value = files || []
    userFileRefs.value = fileRefs || []
    localStats.value = localData
  }
  catch (error) {
    console.error('加载用户数据失败:', error)
  }
  finally {
    isLoading.value = false
  }
}

// 执行双向同步
async function handleFullSync() {
  const success = await bidirectionalSync()
  if (success) {
    // 同步完成后重新加载数据
    await loadUserData()
  }
}

// 清空本地数据
async function handleClearLocal() {
  const alert = await alertController.create({
    header: '确认清空',
    message: '您确定要清空所有本地数据吗？此操作不可恢复！',
    buttons: [
      {
        text: '取消',
        role: 'cancel',
      },
      {
        text: '确定',
        handler: async () => {
          const success = await clearLocalData()
          if (success) {
            await loadUserData()
          }
        },
      },
    ],
  })
  alert.present()
}

async function handleLogout() {
  const alert = await alertController.create({
    header: '确认登出',
    message: '您确定要登出吗？',
    buttons: [
      {
        text: '取消',
        role: 'cancel',
      },
      {
        text: '确定',
        handler: async () => {
          const loading = await loadingController.create({
            message: '正在登出...',
          })
          loading.present()

          try {
            await logout()
            isModalOpen.value = false
          }
          catch (error) {
            console.error('登出失败:', error)
          }
          finally {
            loading.dismiss()
          }
        },
      },
    ],
  })
  alert.present()
}

function closeModal() {
  isModalOpen.value = false
}

function formatDate(dateString: string | number | undefined) {
  if (!dateString)
    return '未知'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 组件挂载时初始化数据库
onMounted(async () => {
  await initDexie()
})
</script>

<template>
  <div v-if="!isLoggedIn">
    <IonButton fill="clear" size="small" @click="handleLogin">
      <IonIcon slot="start" :icon="logInOutline" />
      登录
    </IonButton>
  </div>

  <div v-else>
    <IonButton fill="clear" size="small" @click="handleUserProfile">
      <IonIcon slot="start" :icon="personCircleOutline" />
      {{ currentUser?.email || '用户' }}
    </IonButton>

    <!-- 用户信息弹窗 -->
    <IonModal :is-open="isModalOpen" @did-dismiss="closeModal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>用户信息</IonTitle>
          <IonButton slot="end" fill="clear" @click="closeModal">
            <IonIcon :icon="closeOutline" />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <!-- 用户基本信息 -->
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon :icon="personCircleOutline" />
              基本信息
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel>
                <h3>邮箱</h3>
                <p>{{ currentUser?.email || '未知' }}</p>
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonLabel>
                <h3>用户ID</h3>
                <p>{{ currentUser?.id || '未知' }}</p>
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonLabel>
                <h3>注册时间</h3>
                <p>{{ formatDate(currentUser?.created_at) }}</p>
              </IonLabel>
            </IonItem>
          </IonCardContent>
        </IonCard>

        <!-- 数据统计 -->
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>数据统计</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="4" class="ion-text-center">
                  <div>
                    <IonIcon :icon="documentTextOutline" size="large" color="primary" />
                    <h2>{{ stats.notesCount }}</h2>
                    <p>云端笔记</p>
                    <small>本地: {{ localStats.notes }}</small>
                  </div>
                </IonCol>
                <IonCol size="4" class="ion-text-center">
                  <div>
                    <IonIcon :icon="folderOutline" size="large" color="secondary" />
                    <h2>{{ stats.filesCount }}</h2>
                    <p>云端文件</p>
                    <small>本地: {{ localStats.files }}</small>
                  </div>
                </IonCol>
                <IonCol size="4" class="ion-text-center">
                  <div>
                    <IonIcon :icon="linkOutline" size="large" color="tertiary" />
                    <h2>{{ stats.fileRefsCount }}</h2>
                    <p>云端引用</p>
                    <small>本地: {{ localStats.fileRefs }}</small>
                  </div>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        <!-- 数据同步 -->
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon :icon="syncOutline" />
              数据同步
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <!-- 同步状态 -->
            <div v-if="syncStatus.isSync" class="ion-padding">
              <div class="ion-text-center">
                <IonIcon :icon="refreshOutline" class="rotating-icon" size="large" color="primary" />
                <h3>{{ syncStatus.currentStep }}</h3>
                <p>进度: {{ syncStatus.progress }}%</p>
              </div>
            </div>

            <!-- 同步错误 -->
            <div v-else-if="syncStatus.error" class="ion-padding ion-text-center">
              <p style="color: var(--ion-color-danger)">
                {{ syncStatus.error }}
              </p>
            </div>

            <!-- 最后同步时间 -->
            <div v-else-if="syncStatus.lastSyncTime" class="ion-padding ion-text-center">
              <p>最后同步: {{ formatDate(syncStatus.lastSyncTime.toISOString()) }}</p>
            </div>

            <!-- 同步操作按钮 -->
            <IonGrid>
              <IonRow>
                <IonCol size="6">
                  <IonButton
                    expand="block"
                    fill="outline"
                    :disabled="syncStatus.isSync"
                    @click="handleFullSync"
                  >
                    <IonIcon slot="start" :icon="cloudDownloadOutline" />
                    双向同步
                  </IonButton>
                </IonCol>
                <IonCol size="6">
                  <IonButton
                    expand="block"
                    fill="outline"
                    color="warning"
                    :disabled="syncStatus.isSync"
                    @click="handleClearLocal"
                  >
                    <IonIcon slot="start" :icon="trashOutline" />
                    清空本地
                  </IonButton>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        <!-- 最近笔记 -->
        <IonCard v-if="userNotes.length > 0">
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon :icon="documentTextOutline" />
              最近笔记
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList v-if="!isLoading">
              <IonItem v-for="note in userNotes.slice(0, 5)" :key="note.uuid">
                <IonLabel>
                  <h3>{{ note.title || '无标题' }}</h3>
                  <p>{{ note.type || '未分类' }}</p>
                  <p class="ion-text-wrap">
                    {{ note.newstext?.substring(0, 50) }}{{ note.newstext?.length > 50 ? '...' : '' }}
                  </p>
                  <p><small>{{ formatDate(note.lastdotime || note.newstime) }}</small></p>
                </IonLabel>
                <IonBadge v-if="note.isdeleted" slot="end" color="danger">
                  已删除
                </IonBadge>
              </IonItem>
            </IonList>
            <div v-else class="ion-text-center ion-padding">
              <p>加载中...</p>
            </div>
          </IonCardContent>
        </IonCard>

        <!-- 最近文件 -->
        <IonCard v-if="userFiles.length > 0">
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon :icon="folderOutline" />
              最近文件
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList v-if="!isLoading">
              <IonItem v-for="file in userFiles.slice(0, 5)" :key="file.hash">
                <IonLabel>
                  <h3>{{ file.id || '未命名文件' }}</h3>
                  <p>Hash: {{ file.hash.substring(0, 20) }}...</p>
                  <p v-if="file.path">
                    <a :href="file.path" target="_blank">查看文件</a>
                  </p>
                  <p><small>{{ formatDate(file.lastdotime) }}</small></p>
                </IonLabel>
              </IonItem>
            </IonList>
            <div v-else class="ion-text-center ion-padding">
              <p>加载中...</p>
            </div>
          </IonCardContent>
        </IonCard>

        <!-- 操作按钮 -->
        <IonCard>
          <IonCardContent>
            <IonButton expand="block" color="danger" @click="handleLogout">
              <IonIcon slot="start" :icon="logOutOutline" />
              登出
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonModal>
  </div>
</template>

<style scoped>
.rotating-icon {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.ion-text-center small {
  color: var(--ion-color-medium);
  font-size: 0.8em;
}
</style>
