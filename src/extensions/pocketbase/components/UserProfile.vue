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
  logInOutline,
  logOutOutline,
  personCircleOutline,
  refreshOutline,
} from 'ionicons/icons'
import { computed, ref } from 'vue'
import { useAuth } from '../hooks/useAuth'

const router = useIonRouter()
const { currentUser, logout, isLoggedIn } = useAuth()

// 弹窗控制
const isModalOpen = ref(false)
const isLoading = ref(false)

// 用户信息显示名称
const displayName = computed(() => {
  if (!currentUser.value)
    return '未登录'
  return currentUser.value.email || '用户'
})

// 用户头像 URL (PocketBase 的用户头像处理)
const avatarUrl = computed(() => {
  if (!currentUser.value)
    return null
  // PocketBase 用户头像逻辑可以在这里处理
  return currentUser.value.avatar || null
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
    // 这里可以添加刷新用户信息的逻辑
    console.log('刷新 PocketBase 用户信息')
  }
  catch (error) {
    console.error('刷新用户信息失败:', error)
  }
  finally {
    isLoading.value = false
  }
}

function closeModal() {
  isModalOpen.value = false
}
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

.text-xs {
  font-size: 0.75rem;
}
</style>
