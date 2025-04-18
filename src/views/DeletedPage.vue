<script setup lang="ts">
import type { Note } from '@/hooks/useDexie'
import MessageListItem from '@/components/MessageListItem.vue'

import { useNote } from '@/hooks/useNote'
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

defineEmits(['selected'])

const { getDeletedNotes } = useNote()

const dataList = ref<Note[]>([])

const state = reactive({
  windowWidth: 0,
  currentDetail: '',
})

const noteDesktop = computed(() => {
  return state.windowWidth >= 640
})

function init() {
  getDeletedNotes().then((res) => {
    dataList.value = res
  })
}

onIonViewWillEnter(() => {
  if (!noteDesktop.value)
    init()
})

// 更新窗口宽度的函数
function updateWindowWidth() {
  state.windowWidth = window.innerWidth
}

// 组件挂载时添加监听
onMounted(() => {
  state.windowWidth = window.innerWidth
  window.addEventListener('resize', updateWindowWidth)
})

// 组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener('resize', updateWindowWidth)
})
</script>

<template>
  <IonPage>
    <IonHeader v-if="!noteDesktop" :translucent="true">
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton text="备忘录" default-href="/home" />
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">
            最近删除
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonList>
        <MessageListItem
          v-for="d in dataList"
          :key="d.uuid"
          :data="d"
          :note-desktop
          :class="{ active: state.currentDetail === d.uuid }"
          @selected="(uuid: string) => {
            state.currentDetail = uuid
            $emit('selected', uuid)
          }"
        />
      </IonList>
    </IonContent>
    <IonFooter v-if="!noteDesktop">
      <IonToolbar>
        <IonTitle>
          {{ dataList.length > 0 ? `${dataList.length}个备忘录` : '无备忘录' }}
        </IonTitle>
      </IonToolbar>
    </IonFooter>
  </IonPage>
</template>
