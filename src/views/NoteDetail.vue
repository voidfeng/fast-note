<script setup lang="ts">
import NoteMore from '@/components/NoteMore.vue'
import editor from '@/components/YYEditor.vue'
import { useFileRefs } from '@/hooks/useFileRefs'
import { useFiles } from '@/hooks/useFiles'
import { useNote } from '@/hooks/useNote'
import { getTime } from '@/utils/date'
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonToolbar } from '@ionic/vue'
import { ellipsisHorizontalCircleOutline } from 'ionicons/icons'
import { nanoid } from 'nanoid'
import { computed, onMounted, ref, toRaw, watch } from 'vue'
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
const { getFileByUrl } = useFiles()
const { getFileRefsByRefid, updateFileRef } = useFileRefs()

const editorRef = ref()
const data = ref()
let newNoteUuid = '0'

const noteUuid = computed(() => route.params.uuid as string)

function getBackButtonText() {
  const win = window as any
  const mode = win && win.Ionic && win.Ionic.mode
  return mode === 'ios' ? '备忘录' : ''
}

watch(
  () => props.currentDetail,
  () => {
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
  const time = getTime()
  const uuid = noteUuid.value === '0' ? newNoteUuid : noteUuid.value
  const isExist = await getNote(uuid)
  // 新增
  if (!isExist) {
    const firstNote = await getFirstNote()
    const newNote = {
      title,
      newstext: content,
      newstime: time,
      lastdotime: time,
      type: 'note',
      puuid: (route.query.puuid as string) || firstNote?.uuid,
      uuid,
    }
    await addNote(newNote)
    data.value = newNote
  }
  // 编辑
  else if (content) {
    updateNote(
      uuid,
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
    await deleteNote(uuid)
  }

  // 检查附件引用情况
  const matches = content.matchAll(/<file-upload url="([\w.:/-]+)"/g)
  const fileUrls = Array.from(matches, (match: RegExpMatchArray) => match[1])
  console.warn('fileUrls', fileUrls)
  const dbFiles = await getFileRefsByRefid(uuid)
  console.warn('dbFiles', dbFiles)

  const hashArr = []
  for (const url of fileUrls) {
    if (!/^[a-f0-9]{64}$/i.test(url)) {
      const fileObj = await getFileByUrl(url)
      if (fileObj && fileObj.hash) {
        hashArr.push(fileObj.hash)
      }
      else {
        continue
      }
    }
    else {
      hashArr.push(url)
    }
  }

  for (const dbFile of dbFiles) {
    if (hashArr.includes(dbFile.hash)) {
      await updateFileRef({ ...dbFile, lastdotime: time })
      continue
    }
    await updateFileRef({ ...dbFile, isdeleted: 1, lastdotime: time })
  }
}

async function init(uuid: string) {
  data.value = await getNote(uuid)
  if (data.value) {
    editorRef.value?.setContent(data.value.newstext)
    if (data.value.isdeleted === 1) {
      editorRef.value?.setEditable(false)
    }
  }
}

onMounted(async () => {
  if (noteUuid.value !== '0') {
    init(noteUuid.value)
  }
  else {
    newNoteUuid = nanoid(12)
    window.history.replaceState(null, '', `/n/${newNoteUuid}`)
  }
})
</script>

<template>
  <IonPage>
    <IonHeader :translucent="true">
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton :text="getBackButtonText()" default-href="/" />
        </IonButtons>
        <IonButtons slot="end">
          <IonButton id="more-trigger">
            <IonIcon :icon="ellipsisHorizontalCircleOutline" />
          </IonButton>
        </IonButtons>
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
        <editor ref="editorRef" :uuid="noteUuid === '0' ? newNoteUuid : noteUuid" @blur="onBlur" />
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
