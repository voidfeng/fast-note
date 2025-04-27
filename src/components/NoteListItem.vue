<script setup lang="ts">
import type { NoteDetail } from '@/hooks/useDexie'
import { useDeviceType } from '@/hooks/useDeviceType'
import { IonAccordion, IonIcon, IonItem, IonLabel, IonNote, useIonRouter } from '@ionic/vue'
import dayjs from 'dayjs'
import calendar from 'dayjs/plugin/calendar'
import { folderOutline, trashOutline } from 'ionicons/icons'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineOptions({
  name: 'MessageListItem',
})

const props = withDefaults(
  defineProps<{
    data: NoteDetail
    showParentFolder?: boolean
  }>(),
  {
    showParentFolder: false,
  },
)

const emit = defineEmits(['selected'])

dayjs.extend(calendar)

const route = useRoute()
const router = useIonRouter()
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

function onClick() {
  emit('selected', props.data.uuid)
  router.push(routerLink.value)
}
</script>

<template>
  <IonAccordion v-if="data.type === 'folder'" :value="data.uuid" :class="{ 'no-children': !data.children }" class="message-list-item">
    <IonItem
      v-if="data"
      slot="header"
      :detail="false"
      :uuid="data.uuid"
      class="list-item"
      lines="inset"
      style="--inner-border-width: 0 0 0.55px 0;"
    >
      <IonIcon :icon="$props.data.uuid === 'deleted' ? trashOutline : folderOutline" class="folder-icon mr-3 primary" />
      <IonLabel
        class="ion-text-wrap my-0! py-[10px]!"
        @click.stop="onClick"
      >
        <h2 class="mb-0 line-height-[24px]">
          {{ data.title }}
          <span class="date">
            <IonNote class="text-gray-400 text-base font-semibold">{{ data.noteCount }}</IonNote>
          </span>
        </h2>
      </IonLabel>
    </IonItem>
    <div v-if="data.children" slot="content">
      <MessageListItem v-for="d in data.children" :key="d.uuid" :data="d" class="child-list-item" />
    </div>
  </IonAccordion>
  <IonItem
    v-else
    :detail="false"
    :uuid="data.uuid"
    class="list-item"
    lines="inset"
  >
    <IonLabel
      class="ion-text-wrap my-0! py-[10px]!"
      @click.stop="onClick"
    >
      <h2>
        {{ data.title }}
        <span class="date">
          <!-- <ion-note>{{ data.newstime }}</ion-note> -->
          <!-- <ion-icon aria-hidden="true" :icon="chevronForward" size="small" /> -->
        </span>
      </h2>
      <p class="text-gray-400! text-elipsis!">
        {{ dayjs(data.newstime * 1000).calendar(null, calendarConfig) }}&nbsp;&nbsp;
        {{ data.smalltext }}
      </p>
      <p v-if="showParentFolder" class="text-gray-400!">
        <IonIcon :icon="folderOutline" class="v-text-bottom" />
        {{ data.folderName }}
      </p>
    </IonLabel>
  </IonItem>
</template>

<style lang="scss">
.message-list-item {
  &.no-children {
    .ion-accordion-toggle-icon {
      transform: rotate(270deg) !important;
      color: var(--text-gray-600);
    }
  }
  .child-list-item {
    .folder-icon {
      --uno: pl-8;
    }
    .child-list-item {
      .folder-icon {
        --uno: pl-16;
      }
      .child-list-item {
        .folder-icon {
          --uno: pl-24;
        }
        .child-list-item {
          .folder-icon {
            --uno: pl-32;
          }
        }
      }
    }
  }
  .ion-accordion-toggle-icon {
    transform: rotate(270deg);
    color: var(--primary);
  }
  &.accordion-expanding > [slot='header'] .ion-accordion-toggle-icon,
  &.accordion-expanded > [slot='header'] .ion-accordion-toggle-icon {
    transform: rotate(360deg);
  }
}
.list-item {
  .ion-accordion-toggle-icon {
    font-size: 1.125rem;
  }
}
</style>

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
  margin-right: 8px;
}

.list-item ion-note.md {
  margin-right: 14px;
}
</style>
