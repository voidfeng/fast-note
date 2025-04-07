<script setup lang="ts">
import NoteMore from '@/components/NoteMore.vue'
import editor from '@/components/YYEditor.vue'
import { useNote } from '@/hooks/useNote'
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonToolbar } from '@ionic/vue'
import { ellipsisHorizontalCircleOutline } from 'ionicons/icons'
import { nanoid } from 'nanoid'
import { computed, onMounted, ref, toRaw, version, watch } from 'vue'
import { useRoute } from 'vue-router'

const props = withDefaults(
  defineProps<{
    currentDetail?: string
  }>(),
  {
    currentDetail: '',
  },
)

const route = useRoute()
const { getFirstNote, addNote, getNote, updateNote, deleteNote } = useNote()

const editorRef = ref()
const data = ref()

const noteUuid = computed(() => route.params.uuid as string)

function getBackButtonText() {
  const win = window as any
  const mode = win && win.Ionic && win.Ionic.mode
  return mode === 'ios' ? '备忘录' : ''
}

watch(
  () => props.currentDetail,
  () => {
    console.log('更新了id', props.currentDetail)
    init(props.currentDetail)
  },
  { immediate: true },
)

async function onBlur() {
  /**
   * 保存逻辑
   * 1. 新建时(id为0)
   *   - 如果内容为空，则不保存
   *   - 如果内容不为空，则保存
   * 2. 编辑时(id不为0)
   *   - 全部保存
   */
  const title = editorRef.value?.getTitle()
  const content = editorRef.value?.getContent()
  const time = Math.floor(Date.now() / 1000)
  // 新增
  if (noteUuid.value === '0' && content) {
    const firstNote = await getFirstNote()
    const id = await addNote({
      title,
      newstext: content,
      newstime: time,
      lastdotime: time,
      type: 'note',
      puuid: (route.query.puuid as string) || firstNote?.uuid,
      uuid: nanoid(12),
      version: 1,
    })
    window.history.replaceState(null, '', `/n/${id}`)
  }
  // 编辑
  else if (content) {
    updateNote(
      noteUuid.value,
      Object.assign(toRaw(data.value), {
        title,
        newstext: content,
        newstime: time,
        lastdotime: time,
        version: (data.value.version || 1) + 1,
      }),
    )
  }
  // 删除
  else {
    await deleteNote(noteUuid.value)
  }
}

async function init(uuid: string) {
  data.value = await getNote(uuid)
  if (data.value) {
    console.log('data', uuid, data.value.newstext)
    editorRef.value?.setContent(data.value.newstext)
  }
}

onMounted(async () => {
  if (noteUuid.value) {
    init(noteUuid.value)
  }
})
</script>

<template>
  <IonPage>
    <IonHeader :translucent="true">
      <IonToolbar>
        <template #start>
          <IonButtons>
            <IonBackButton :text="getBackButtonText()" default-href="/" />
          </IonButtons>
        </template>
        <template #end>
          <IonButtons>
            <IonButton id="more-trigger">
              <IonIcon :icon="ellipsisHorizontalCircleOutline" />
            </IonButton>
          </IonButtons>
        </template>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <!-- <ion-item>
        <ion-icon aria-hidden="true" :icon="personCircle" color="primary"></ion-icon>
        <ion-label class="ion-text-wrap">
          <h2>
            {{ message.fromName }}
            <span class="date">
              <ion-note>{{ message.date }}</ion-note>
            </span>
          </h2>
          <h3>To: <ion-note>Me</ion-note></h3>
        </ion-label>
      </ion-item> -->

      <div class="ion-padding">
        <editor ref="editorRef" @blur="onBlur" />
      </div>
    </IonContent>
    <NoteMore />
  </IonPage>
</template>

<style scoped>
ion-item {
  --inner-padding-end: 0;
  --background: transparent;
}

ion-label {
  margin-top: 12px;
  margin-bottom: 12px;
}

ion-item h2 {
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

ion-item .date {
  align-items: center;
  display: flex;
}

ion-item ion-icon {
  font-size: 42px;
  margin-right: 8px;
}

ion-item ion-note {
  font-size: 0.9375rem;
  margin-right: 12px;
  font-weight: normal;
}

p {
  line-height: 1.4;
}
</style>
