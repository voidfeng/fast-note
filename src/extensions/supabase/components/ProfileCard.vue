<script setup lang="ts">
import {
  alertController,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSpinner,
  toastController,
} from '@ionic/vue'
import { personCircleOutline, refreshOutline } from 'ionicons/icons'
import { ref, watch } from 'vue'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'

const {
  profile,
  isLoadingProfile,
  profileError,
  hasProfile,
  hasUsername,
  displayName,
  fetchProfile,
  updateProfile,
  checkUsernameAvailable,
} = useProfile()

const { currentUser } = useAuth()

// 编辑状态
const editingUsername = ref('')
const isUpdating = ref(false)

// 监听 profile 变化，同步编辑状态
watch(profile, (newProfile) => {
  if (newProfile) {
    editingUsername.value = newProfile.username || ''
  }
}, { immediate: true })

// 格式化日期
function formatDate(dateString?: string) {
  if (!dateString)
    return '未知'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 更新用户名
async function updateUsername() {
  const newUsername = editingUsername.value.trim()

  if (!newUsername) {
    const toast = await toastController.create({
      message: '用户名不能为空',
      duration: 2000,
      color: 'warning',
    })
    await toast.present()
    return
  }

  isUpdating.value = true

  // 检查用户名是否可用
  const isAvailable = await checkUsernameAvailable(newUsername)
  if (!isAvailable) {
    isUpdating.value = false
    const toast = await toastController.create({
      message: '用户名已被使用，请选择其他用户名',
      duration: 3000,
      color: 'danger',
    })
    await toast.present()
    return
  }

  // 更新用户名
  const success = await updateProfile({ username: newUsername })
  isUpdating.value = false

  if (success) {
    const toast = await toastController.create({
      message: '用户名更新成功',
      duration: 2000,
      color: 'success',
    })
    await toast.present()
  }
  else {
    const toast = await toastController.create({
      message: '用户名更新失败，请重试',
      duration: 3000,
      color: 'danger',
    })
    await toast.present()
  }
}

// 取消编辑
function cancelEdit() {
  editingUsername.value = profile.value?.username || ''
}

// 编辑头像
async function editAvatar() {
  const alert = await alertController.create({
    header: '更换头像',
    message: '请输入头像图片的 URL 地址',
    inputs: [
      {
        name: 'avatarUrl',
        type: 'url',
        placeholder: 'https://example.com/avatar.jpg',
        value: profile.value?.avatar_url || '',
      },
    ],
    buttons: [
      {
        text: '取消',
        role: 'cancel',
      },
      {
        text: '保存',
        handler: async (data) => {
          const avatarUrl = data.avatarUrl?.trim()
          const success = await updateProfile({ avatar_url: avatarUrl || null })

          if (success) {
            const toast = await toastController.create({
              message: '头像更新成功',
              duration: 2000,
              color: 'success',
            })
            await toast.present()
          }
          else {
            const toast = await toastController.create({
              message: '头像更新失败，请重试',
              duration: 3000,
              color: 'danger',
            })
            await toast.present()
          }
        },
      },
    ],
  })

  await alert.present()
}

// 刷新 profile 数据
async function refreshProfile() {
  await fetchProfile(true)
  const toast = await toastController.create({
    message: '数据已刷新',
    duration: 1500,
    color: 'success',
  })
  await toast.present()
}
</script>

<template>
  <IonCard>
    <IonCardHeader>
      <IonCardTitle>
        <IonIcon :icon="personCircleOutline" />
        个人信息
      </IonCardTitle>
    </IonCardHeader>

    <IonCardContent>
      <!-- 加载状态 -->
      <div v-if="isLoadingProfile" class="loading-container">
        <IonSpinner name="crescent" />
        <p>加载用户信息中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="profileError" class="error-container">
        <p style="color: var(--ion-color-danger)">
          {{ profileError }}
        </p>
        <IonButton fill="clear" size="small" @click="fetchProfile(true)">
          重试
        </IonButton>
      </div>

      <!-- 用户信息 -->
      <div v-else-if="hasProfile">
        <!-- 头像和显示名称 -->
        <div class="profile-header">
          <div class="avatar-container">
            <img
              v-if="profile?.avatar_url"
              :src="profile.avatar_url"
              :alt="displayName"
              class="avatar"
            >
            <div v-else class="avatar-placeholder">
              <IonIcon name="person" />
            </div>
          </div>
          <div class="profile-info">
            <h3>{{ displayName }}</h3>
            <p>{{ currentUser?.email }}</p>
          </div>
          <IonButton fill="clear" size="small" @click="editAvatar">
            更换头像
          </IonButton>
        </div>

        <!-- 用户名编辑 -->
        <div class="username-section">
          <IonItem>
            <IonLabel position="stacked">
              用户名
            </IonLabel>
            <IonInput
              v-model="editingUsername"
              :placeholder="hasUsername ? (profile?.username || '') : '请设置用户名'"
              :disabled="isUpdating"
            />
          </IonItem>

          <div v-if="editingUsername !== profile?.username" class="username-actions">
            <IonButton
              :disabled="isUpdating || !editingUsername?.trim()"
              size="small"
              @click="updateUsername"
            >
              <IonSpinner v-if="isUpdating" name="crescent" />
              <span v-else>保存</span>
            </IonButton>

            <IonButton
              fill="clear"
              size="small"
              :disabled="isUpdating"
              @click="cancelEdit"
            >
              取消
            </IonButton>
          </div>
        </div>

        <!-- 基本信息 -->
        <div class="basic-info">
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
          <IonItem>
            <IonLabel>
              <h3>最后更新</h3>
              <p>{{ formatDate(profile?.updated_at) }}</p>
            </IonLabel>
          </IonItem>
        </div>

        <!-- 刷新按钮 -->
        <div class="actions">
          <IonButton fill="outline" size="small" @click="refreshProfile">
            <IonIcon slot="start" :icon="refreshOutline" />
            刷新数据
          </IonButton>
        </div>
      </div>

      <!-- 无数据状态 -->
      <div v-else class="no-data">
        <p>未找到用户信息</p>
        <IonButton fill="outline" size="small" @click="fetchProfile(true)">
          重新加载
        </IonButton>
      </div>
    </IonCardContent>
  </IonCard>
</template>

<style scoped>
.loading-container,
.error-container,
.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
}

.loading-container p {
  margin-top: 12px;
  color: var(--ion-color-medium);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 0;
}

.avatar-container {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--ion-color-light);
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: var(--ion-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--ion-color-medium);
}

.profile-info {
  flex: 1;
}

.profile-info h3 {
  margin: 0 0 4px 0;
  font-size: 1.1em;
  font-weight: 600;
}

.profile-info p {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9em;
}

.username-section {
  margin-bottom: 20px;
}

.username-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
}

.basic-info {
  margin-bottom: 20px;
}

.actions {
  display: flex;
  justify-content: center;
}
</style>
