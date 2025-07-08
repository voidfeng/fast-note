<script setup lang="ts">
import type { Note } from '@/hooks/useDexie'
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import NoteList from '@/components/NoteList.vue'
import { useDeviceType } from '@/hooks/useDeviceType'
import { useIonicLongPressList } from '@/hooks/useIonicLongPressList'
import { useNote } from '@/hooks/useNote'

defineEmits(['selected'])

const { getDeletedNotes } = useNote()
const { isDesktop } = useDeviceType()

const dataList = ref<Note[]>([])
const longPressMenuOpen = ref(false)
const longPressUUID = ref('')
const listRef = ref()
useIonicLongPressList(listRef, {
  itemSelector: 'ion-item', // 匹配 ion-item 元素
  duration: 500,
  pressedClass: 'item-long-press',
  onItemLongPress: async (element) => {
    const uuid = element.getAttribute('uuid')
    if (uuid) {
      longPressUUID.value = uuid
      longPressMenuOpen.value = true
    }
  },
})
const state = reactive({
  windowWidth: 0,
  noteUuid: '',
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

      <NoteList
        ref="listRef"
        v-model:note-uuid="state.noteUuid"
        :data-list="dataList"
        :press-items="[{ type: 'restore' }, { type: 'deleteNow' }]"
        @selected="$emit('selected', $event)"
      />
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
