<script setup lang="ts">
import {
  alertController,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSpinner,
  toastController,
} from '@ionic/vue'
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
  clearProfileCache,
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

  // 检查用户名是否可用
  isUpdating.value = true
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

// 清除缓存
async function clearCache() {
  const alert = await alertController.create({
    header: '清除缓存',
    message: '确定要清除本地缓存的用户数据吗？',
    buttons: [
      {
        text: '取消',
        role: 'cancel',
      },
      {
        text: '确定',
        handler: () => {
          clearProfileCache()
          const toast = toastController.create({
            message: '缓存已清除',
            duration: 1500,
            color: 'success',
          })
          toast.then(t => t.present())
        },
      },
    ],
  })

  await alert.present()
}
</script>

<template>
  <div class="profile-manager">
    <!-- 加载状态 -->
    <div v-if="isLoadingProfile" class="loading-container">
      <IonSpinner name="crescent" />
      <p>加载用户信息中...</p>
    </div>

    <!-- 错误状态 -->
    <IonCard v-else-if="profileError" color="danger">
      <IonCardContent>
        <p>{{ profileError }}</p>
        <IonButton fill="clear" size="small" @click="fetchProfile(true)">
          重试
        </IonButton>
      </IonCardContent>
    </IonCard>

    <!-- 用户信息展示和编辑 -->
    <div v-else-if="hasProfile" class="profile-content">
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>用户信息</IonCardTitle>
          <IonCardSubtitle>{{ displayName }}</IonCardSubtitle>
        </IonCardHeader>

        <IonCardContent>
          <!-- 头像展示 -->
          <div class="avatar-section">
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

            <div class="username-actions">
              <IonButton
                v-if="editingUsername !== profile?.username"
                :disabled="isUpdating || !editingUsername?.trim()"
                size="small"
                @click="updateUsername"
              >
                <IonSpinner v-if="isUpdating" name="crescent" />
                <span v-else>保存</span>
              </IonButton>

              <IonButton
                v-if="editingUsername !== profile?.username"
                fill="clear"
                size="small"
                :disabled="isUpdating"
                @click="cancelEdit"
              >
                取消
              </IonButton>
            </div>
          </div>

          <!-- 用户信息 -->
          <div class="user-info">
            <IonItem>
              <IonLabel>
                <h3>邮箱</h3>
                <p>{{ currentUser?.email }}</p>
              </IonLabel>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>注册时间</h3>
                <p>{{ formatDate(profile?.created_at) }}</p>
              </IonLabel>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>最后更新</h3>
                <p>{{ formatDate(profile?.updated_at) }}</p>
              </IonLabel>
            </IonItem>
          </div>

          <!-- 操作按钮 -->
          <div class="actions">
            <IonButton fill="outline" size="small" @click="refreshProfile">
              <IonIcon slot="start" name="refresh" />
              刷新数据
            </IonButton>

            <IonButton fill="clear" size="small" @click="clearCache">
              <IonIcon slot="start" name="trash" />
              清除缓存
            </IonButton>
          </div>
        </IonCardContent>
      </IonCard>
    </div>

    <!-- 无数据状态 -->
    <IonCard v-else>
      <IonCardContent>
        <p>未找到用户信息</p>
        <IonButton fill="outline" size="small" @click="fetchProfile(true)">
          重新加载
        </IonButton>
      </IonCardContent>
    </IonCard>
  </div>
</template>

<style scoped>
.profile-manager {
  padding: 16px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.loading-container p {
  margin-top: 16px;
  color: var(--ion-color-medium);
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}

.avatar-container {
  width: 80px;
  height: 80px;
  margin-bottom: 12px;
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
  font-size: 32px;
  color: var(--ion-color-medium);
}

.username-section {
  margin-bottom: 24px;
}

.username-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
}

.user-info {
  margin-bottom: 24px;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
