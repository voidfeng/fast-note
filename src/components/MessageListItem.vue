<script setup lang="ts">
import { Category } from '@/hooks/useDexie'
import { IonIcon, IonItem, IonLabel, IonNote } from '@ionic/vue'
import { chevronForward, folderOutline } from 'ionicons/icons'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = withDefaults(
  defineProps<{
    data: Category
  }>(),
  {
    data: () => ({} as Category),
  },
)

const route = useRoute()

const routerLink = computed(() => {
  if (props.data.type === 'folder') {
    /**
     * 文件夹跳转逻辑
     * 1. 首页到文件夹: /f/ + id
     * 2. 文件夹到文件夹: 当前路径 + id
     */
    const isHome = route.path === '/home'
    if (isHome) {
      return '/f/' + props.data.id
    } else {
      return route.path + '/' + props.data.id
    }
  }
  return '/n/' + props.data.id
})
</script>

<template>
  <ion-item v-if="data" :routerLink="routerLink" :detail="false" class="list-item">
    <template v-if="data.type === 'folder'">
      <ion-icon :icon="folderOutline" class="mr-3" />
      <ion-label class="ion-text-wrap">
        <h2>
          {{ data.title }}
          <span class="date">
            <ion-note>{{ data.newstime }}</ion-note>
            <ion-icon aria-hidden="true" :icon="chevronForward" size="small" />
          </span>
        </h2>
      </ion-label>
    </template>
    <template v-else>
      <ion-label class="ion-text-wrap">
        <h2>
          {{ data.title }}
          <span class="date">
            <ion-note>{{ data.newstime }}</ion-note>
            <ion-icon aria-hidden="true" :icon="chevronForward" size="small" />
          </span>
        </h2>
      </ion-label>
    </template>
  </ion-item>
</template>

<style scoped>
.list-item ion-label {
  margin-top: 12px;
  margin-bottom: 12px;
}

.list-item h2 {
  font-weight: 600;
  margin: 0;

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

.list-item ion-icon {
  color: #c9c9ca;
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
