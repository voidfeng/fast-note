<script setup lang="ts">
import type { Note } from '@/hooks/useDexie'
import MessageListItem from '@/components/MessageListItem.vue'

import { useDeviceType } from '@/hooks/useDeviceType'
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
import { onMounted, onUnmounted, reactive, ref } from 'vue'

defineEmits(['selected'])

const { getDeletedNotes } = useNote()
const { isDesktop } = useDeviceType()

const dataList = ref<Note[]>([])

const state = reactive({
  windowWidth: 0,
  currentDetail: '',
})

function init() {
  getDeletedNotes().then((res) => {
    dataList.value = res
  })
}

onIonViewWillEnter(() => {
  if (!isDesktop.value)
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
    <IonHeader v-if="!isDesktop" :translucent="true">
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
          :class="{ active: state.currentDetail === d.uuid }"
          @selected="(uuid: string) => {
            state.currentDetail = uuid
            $emit('selected', uuid)
          }"
        />
      </IonList>
    </IonContent>
    <IonFooter v-if="!isDesktop">
      <IonToolbar>
        <IonTitle>
          {{ dataList.length > 0 ? `${dataList.length}个备忘录` : '无备忘录' }}
        </IonTitle>
      </IonToolbar>
    </IonFooter>
  </IonPage>
</template>
