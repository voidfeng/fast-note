<script setup lang="ts">
import type { NoteDetail } from '@/hooks/useDexie'
import { useDeviceType } from '@/hooks/useDeviceType'
import { IonIcon, IonItem, IonLabel, IonNote } from '@ionic/vue'
import dayjs from 'dayjs'
import calendar from 'dayjs/plugin/calendar'
import { chevronForward, folderOutline, trashOutline } from 'ionicons/icons'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = withDefaults(
  defineProps<{
    data: NoteDetail
    showParentFolder?: boolean
  }>(),
  {
    showParentFolder: false,
  },
)

defineEmits(['selected'])

dayjs.extend(calendar)

const route = useRoute()
const { isDesktop } = useDeviceType()
const calendarConfig = {
  sameDay: 'HH:mm', // 今天显示时间
  lastDay: '[昨天] HH:mm', // 昨天显示"昨天 HH:mm:ss"
  lastWeek: 'YYYY/M/D', // 上周
  sameElse: 'YYYY/M/D', // 其他情况
}

const routerLink = computed(() => {
  if (isDesktop.value)
    return undefined

  if (props.data.uuid === 'deleted') {
    return `/deleted`
  }

  if (props.data.type === 'folder') {
    /**
     * 文件夹跳转逻辑
     * 1. isDesktop 不跳转
     * 1. 首页到文件夹: /f/ + id
     * 2. 文件夹到文件夹: 当前路径 + id
     */
    const isHome = route.path === '/home'
    if (isHome) {
      return `/f/${props.data.uuid}`
    }
    else {
      return `${route.path}/${props.data.uuid}`
    }
  }
  return `/n/${props.data.uuid}`
})
</script>

<template>
  <IonItem
    v-if="data"
    :router-link="routerLink"
    :detail="false"
    class="list-item"
    @click="$emit('selected', $props.data.uuid)"
  >
    <template v-if="data.type === 'folder'">
      <IonIcon :icon="$props.data.uuid === 'deleted' ? trashOutline : folderOutline" class="mr-3" />
      <IonLabel class="ion-text-wrap">
        <h2 class="mb-0">
          {{ data.title }}
          <span class="date">
            <IonNote>{{ data.noteCount }}</IonNote>
          </span>
        </h2>
      </IonLabel>
      <IonIcon aria-hidden="true" :icon="chevronForward" size="small" class="text-gray-500" />
    </template>
    <template v-else>
      <IonLabel class="ion-text-wrap">
        <h2>
          {{ data.title }}
          <span class="date">
            <!-- <ion-note>{{ data.newstime }}</ion-note> -->
            <!-- <ion-icon aria-hidden="true" :icon="chevronForward" size="small" /> -->
          </span>
        </h2>
        <p class="text-gray-400!">
          {{ dayjs(data.newstime * 1000).calendar(null, calendarConfig) }}
        </p>
        <p v-if="showParentFolder" class="text-gray-400!">
          <IonIcon :icon="folderOutline" class="v-text-bottom" />
          {{ data.folderName }}
        </p>
      </IonLabel>
    </template>
  </IonItem>
</template>

<style lang="scss" scoped>
.list-item {
  &.active {
    --background: #4d8dff;
  }
  ion-label {
    margin-top: 12px;
    margin-bottom: 12px;
  }
}

.list-item h2 {
  font-weight: 600;

  /**
   * With larger font scales
   * the date/time should wrap to the next
   * line. However, there should be
   * space between the name and the date/time
   * if they can appear on the same line.
   */
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.list-item .date {
  align-items: center;
  display: flex;
}

.list-item ion-note {
  font-size: 0.9375rem;
  margin-right: 8px;
  font-weight: normal;
}

.list-item ion-note.md {
  margin-right: 14px;
}
</style>
