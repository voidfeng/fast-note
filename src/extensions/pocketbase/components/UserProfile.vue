<script setup lang="ts">
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
  cloudDoneOutline,
  logInOutline,
  logOutOutline,
  personCircleOutline,
  refreshOutline,
  syncOutline,
  warningOutline,
} from 'ionicons/icons'
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../hooks/useAuth'
import { useSync } from '../hooks/useSync'

const router = useIonRouter()
const { currentUser, logout, isLoggedIn } = useAuth()
const { sync, syncing, syncStatus, getLocalDataStats } = useSync()

// 弹窗控制
const isModalOpen = ref(false)
const isLoading = ref(false)

// 同步相关状态
const syncResult = ref<{ uploaded: number, downloaded: number, deleted: number } | null>(null)
const localStats = ref<{ notes: number } | null>(null)

// 用户信息显示名称
const displayName = computed(() => {
  if (!currentUser.value)
    return '未登录'
  return currentUser.value.email || '用户'
})

function handleLogin() {
  router.push('/pocketbase/login')
}

async function handleUserProfile() {
  isModalOpen.value = true
}

async function handleLogout() {
  try {
    const alert = await alertController.create({
      header: '确认退出',
      message: '您确定要退出登录吗？',
      buttons: [
        {
          text: '取消',
          role: 'cancel',
        },
        {
          text: '确认',
          handler: async () => {
            const loading = await loadingController.create({
              message: '正在退出...',
            })
            await loading.present()

            await logout()

            await loading.dismiss()
          },
        },
      ],
    })

    await alert.present()
  }
  catch (error) {
    console.error('退出登录失败:', error)
  }
}

async function handleRefresh() {
  isLoading.value = true
  try {
    // 刷新用户信息和本地数据统计
    console.warn('刷新 PocketBase 用户信息')
    await loadLocalStats()
  }
  catch (error) {
    console.error('刷新用户信息失败:', error)
  }
  finally {
    isLoading.value = false
  }
}

// 加载本地数据统计
async function loadLocalStats() {
  try {
    localStats.value = await getLocalDataStats()
  }
  catch (error) {
    console.error('获取本地数据统计失败:', error)
  }
}

// 处理同步功能
async function handleSync() {
  if (!isLoggedIn.value) {
    const alert = await alertController.create({
      header: '未登录',
      message: '请先登录 PocketBase 账户后再进行同步',
      buttons: ['确定'],
    })
    await alert.present()
    return
  }

  try {
    const loading = await loadingController.create({
      message: '正在同步数据...',
    })
    await loading.present()

    const result = await sync()
    syncResult.value = result

    await loading.dismiss()

    // 显示同步结果
    const alert = await alertController.create({
      header: '同步完成',
      message: `上传: ${result.uploaded} 条, 下载: ${result.downloaded} 条, 删除: ${result.deleted} 条`,
      buttons: ['确定'],
    })
    await alert.present()

    // 刷新本地数据统计
    await loadLocalStats()
  }
  catch (error) {
    console.error('同步失败:', error)

    const alert = await alertController.create({
      header: '同步失败',
      message: error instanceof Error ? error.message : '同步过程中发生错误',
      buttons: ['确定'],
    })
    await alert.present()
  }
}

function closeModal() {
  isModalOpen.value = false
}

// 组件挂载时加载本地数据统计
onMounted(() => {
  if (isLoggedIn.value) {
    loadLocalStats()
  }
})
</script>

<template>
  <!-- 头部用户信息按钮 -->
  <div class="flex items-center">
    <IonButton
      v-if="!isLoggedIn"
      fill="clear"
      size="small"
      @click="handleLogin"
    >
      <IonIcon slot="icon-only" :icon="logInOutline" />
    </IonButton>

    <IonButton
      v-else
      fill="clear"
      size="small"
      @click="handleUserProfile"
    >
      <div class="flex items-center space-x-1">
        <IonIcon :icon="personCircleOutline" />
        <IonBadge color="primary" class="text-xs">
          PB
        </IonBadge>
      </div>
    </IonButton>
  </div>

  <!-- 用户信息详情弹窗 -->
  <IonModal :is-open="isModalOpen" @did-dismiss="closeModal">
    <IonHeader>
      <IonToolbar>
        <IonTitle>PocketBase 用户信息</IonTitle>
        <IonButton
          slot="end"
          fill="clear"
          @click="closeModal"
        >
          <IonIcon :icon="closeOutline" />
        </IonButton>
      </IonToolbar>
    </IonHeader>

    <IonContent class="ion-padding">
      <IonGrid>
        <IonRow>
          <IonCol size="12">
            <!-- 用户基本信息 -->
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>用户信息</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  <IonItem>
                    <IonLabel>
                      <h3>用户名</h3>
                      <p>{{ displayName }}</p>
                    </IonLabel>
                    <IonIcon slot="end" :icon="personCircleOutline" />
                  </IonItem>

                  <IonItem v-if="currentUser?.email">
                    <IonLabel>
                      <h3>邮箱</h3>
                      <p>{{ currentUser.email }}</p>
                    </IonLabel>
                  </IonItem>

                  <IonItem v-if="currentUser?.created">
                    <IonLabel>
                      <h3>注册时间</h3>
                      <p>{{ new Date(currentUser.created).toLocaleDateString('zh-CN') }}</p>
                    </IonLabel>
                  </IonItem>

                  <IonItem v-if="currentUser?.updated">
                    <IonLabel>
                      <h3>更新时间</h3>
                      <p>{{ new Date(currentUser.updated).toLocaleDateString('zh-CN') }}</p>
                    </IonLabel>
                  </IonItem>
                </IonList>
              </IonCardContent>
            </IonCard>

            <!-- 数据统计信息 -->
            <IonCard v-if="isLoggedIn">
              <IonCardHeader>
                <IonCardTitle class="flex items-center">
                  <IonIcon :icon="cloudDoneOutline" class="mr-2" />
                  数据统计
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  <IonItem>
                    <IonLabel>
                      <h3>本地笔记数量</h3>
                      <p>{{ localStats?.notes ?? '加载中...' }} 条</p>
                    </IonLabel>
                  </IonItem>

                  <IonItem v-if="syncResult">
                    <IonLabel>
                      <h3>上次同步结果</h3>
                      <p>上传: {{ syncResult.uploaded }} 条, 下载: {{ syncResult.downloaded }} 条, 删除: {{ syncResult.deleted }} 条</p>
                    </IonLabel>
                  </IonItem>

                  <IonItem v-if="syncStatus.lastSyncTime">
                    <IonLabel>
                      <h3>上次同步时间</h3>
                      <p>{{ syncStatus.lastSyncTime.toLocaleString('zh-CN') }}</p>
                    </IonLabel>
                  </IonItem>

                  <IonItem v-if="syncStatus.error">
                    <IonLabel color="danger">
                      <h3>同步错误</h3>
                      <p>{{ syncStatus.error }}</p>
                    </IonLabel>
                    <IonIcon slot="end" :icon="warningOutline" color="danger" />
                  </IonItem>
                </IonList>
              </IonCardContent>
            </IonCard>

            <!-- 操作按钮 -->
            <div class="flex mt-4 flex-col space-y-3">
              <IonButton
                expand="block"
                fill="outline"
                :disabled="isLoading"
                @click="handleRefresh"
              >
                <IonIcon slot="start" :icon="refreshOutline" />
                刷新信息
              </IonButton>

              <IonButton
                v-if="isLoggedIn"
                expand="block"
                color="primary"
                :disabled="syncing || isLoading"
                @click="handleSync"
              >
                <IonIcon slot="start" :icon="syncOutline" />
                {{ syncing ? '同步中...' : '同步数据' }}
              </IonButton>

              <IonButton
                expand="block"
                color="danger"
                @click="handleLogout"
              >
                <IonIcon slot="start" :icon="logOutOutline" />
                退出登录
              </IonButton>
            </div>
          </IonCol>
        </IonRow>
      </IonGrid>
    </IonContent>
  </IonModal>
</template>

<style scoped>
.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.space-x-1 > * + * {
  margin-left: 0.25rem;
}

.flex-col {
  flex-direction: column;
}

.space-y-3 > * + * {
  margin-top: 0.75rem;
}

.mt-4 {
  margin-top: 1rem;
}

.mr-2 {
  margin-right: 0.5rem;
}

.text-xs {
  font-size: 0.75rem;
}
</style>
