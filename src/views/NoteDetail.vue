<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { IonBackButton, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonPage, IonToolbar, isPlatform, onIonViewWillLeave } from '@ionic/vue'
import { attachOutline, checkmarkCircleOutline, ellipsisHorizontalCircleOutline, textOutline } from 'ionicons/icons'
import { nanoid } from 'nanoid'
import { computed, onMounted, reactive, ref, toRaw, watch } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '@/components/Icon.vue'
import NoteMore from '@/components/NoteMore.vue'
import TableFormatModal from '@/components/TableFormatModal.vue'
import TextFormatModal from '@/components/TextFormatModal.vue'
import YYEditor from '@/components/YYEditor.vue'
import { useDeviceType } from '@/hooks/useDeviceType'
import { useFileRefs } from '@/hooks/useFileRefs'
import { useFiles } from '@/hooks/useFiles'
import { useNote } from '@/hooks/useNote'
import { useVisualViewport } from '@/hooks/useVisualViewport'
import { getTime } from '@/utils/date'

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
const { isDesktop } = useDeviceType()
const { keyboardHeight, restoreHeight } = useVisualViewport()

const isIos = isPlatform('ios')
const pageRef = ref()
const editorRef = ref()
const fileInputRef = ref()
const imageInputRef = ref()
const data = ref()
let newNoteUuid = '0'
const state = reactive({
  showFormat: false,
  showTableFormat: false,
})

const noteUuid = computed(() => route.params.uuid as string)

watch(() => state.showTableFormat, changeFormatModal)
watch(() => state.showFormat, changeFormatModal)

function changeFormatModal(n: boolean) {
  if (n) {
    editorRef.value?.setInputMode('none')
    setTimeout(() => {
      editorRef.value?.editor.chain().focus()
    }, 500)
  }
  else {
    editorRef.value?.setInputMode('text')
    setTimeout(() => {
      editorRef.value?.editor.chain().blur()
      setTimeout(() => {
        editorRef.value?.editor.chain().focus()
      }, 300)
    }, 10)
  }
}

function getBackButtonText() {
  const win = window as any
  const mode = win && win.Ionic && win.Ionic.mode
  return mode === 'ios' ? '备忘录' : ''
}

watch(
  () => props.currentDetail,
  () => {
    if (props.currentDetail) {
      init(props.currentDetail)
    }
  },
  { immediate: true },
)

async function onBlur() {
  restoreHeight()
  /**
   * 保存逻辑
   * 1. 新建时(id为0)
   *   - 如果内容为空，则不保存
   *   - 如果内容不为空，则保存
   * 2. 编辑时(id不为0)
   *   - 全部保存
   */
  const { title, smalltext } = editorRef.value.getTitle()
  const content = editorRef.value?.getContent()
  const time = getTime()
  const uuid = noteUuid.value === '0' ? newNoteUuid : noteUuid.value
  const isExist = await getNote(uuid)
  // 新增
  if (!isExist) {
    const firstNote = await getFirstNote()
    const newNote = {
      title,
      smalltext,
      newstext: content,
      newstime: time,
      lastdotime: time,
      type: 'note',
      puuid: (route.query.puuid as string) || firstNote?.uuid,
      uuid,
      isdeleted: 0,
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
        smalltext,
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

// function onFormat(command: string) {
//   editorRef.value.format(command)
// }

function onSelectFile(e: Event) {
  editorRef.value.insertFile(e)
}

function onInsertTodo() {
  editorRef.value?.editor.chain().focus().toggleTaskList().run()
}

onMounted(async () => {
  if (noteUuid.value && noteUuid.value !== '0') {
    init(noteUuid.value)
  }
  else if (!isDesktop.value) {
    newNoteUuid = nanoid(12)
    window.history.replaceState(null, '', `/n/${newNoteUuid}`)
  }
})

onIonViewWillLeave(() => {
  setTimeout(() => {
    state.showFormat = false
  }, 300)
})
</script>

<template>
  <IonPage ref="pageRef">
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

    <IonContent :fullscreen="true" force-overscroll>
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
        <YYEditor
          v-if="noteUuid === '0' ? newNoteUuid : noteUuid"
          ref="editorRef"
          :uuid="noteUuid === '0' ? newNoteUuid : noteUuid"
          @blur="onBlur"
        />
      </div>
      <!-- <div v-if="keyboardHeight > 0" slot="fixed" :style="{ top: `${visualHeight - 66}px` }" class="h-[66px]">
        Fixed Button
      </div> -->
    </IonContent>
    <!-- <IonFooter v-if="keyboardHeight > 0" style="overscroll-behavior: none;"> -->
    <IonFooter>
      <IonToolbar class="note-detail__toolbar">
        <div class="flex justify-evenly items-center select-none">
          <IonButton
            fill="clear"
            size="large"
            @touchstart.prevent="() => {
              if (keyboardHeight > 0) {
                state.showTableFormat = true
                editorRef?.setInputMode('none')
              }
            }"
            @click="state.showTableFormat = true"
          >
            <Icon name="table" class="text-6.5" />
          </IonButton>
          <IonButton
            fill="clear"
            size="large"
            @touchstart.prevent="() => {
              if (keyboardHeight > 0) {
                state.showFormat = true
                editorRef?.setInputMode('none')
              }
            }"
            @click="state.showFormat = true"
          >
            <IonIcon :icon="textOutline" />
          </IonButton>
          <IonButton
            fill="clear"
            size="large"
            @touchstart.prevent="onInsertTodo"
            @click="onInsertTodo"
          >
            <IonIcon :icon="checkmarkCircleOutline" />
          </IonButton>
          <IonButton
            v-if="!isIos"
            fill="clear"
            size="large"
            @touchstart.prevent="imageInputRef.click()"
            @click="imageInputRef.click()"
          >
            <Icon name="image" class="text-6.5" />
            <input ref="imageInputRef" type="file" accept="image/*" class="pointer-events-none absolute text-0 opacity-0" @change="onSelectFile">
          </IonButton>
          <IonButton
            fill="clear"
            size="large"
            @click="fileInputRef.click()"
          >
            <Icon v-if="isIos" name="image" class="text-6.5" />
            <IonIcon v-else :icon="attachOutline" />
            <input ref="fileInputRef" type="file" class="pointer-events-none absolute text-0 opacity-0" @change="onSelectFile">
          </IonButton>
        </div>
      </IonToolbar>
    </IonFooter>
    <NoteMore />
    <TableFormatModal v-model:is-open="state.showTableFormat" :editor="(editorRef?.editor || {}) as Editor" />
    <TextFormatModal v-model:is-open="state.showFormat" :editor="(editorRef?.editor || {}) as Editor" />
  </IonPage>
</template>

<style lang="scss">
.note-detail__toolbar {
  --background: #1c1c1e;
  --padding-top: 0;
  --padding-bottom: 0;
  --padding-start: 0;
  --padding-end: 0;
  ion-button {
    --padding-top: 0;
    --padding-bottom: 0;
    min-height: 0;
    height: 44px;
    width: 24%;
    margin: 0;
    &:first-child {
      width: 26%;
      padding-left: 2%;
    }
    &:last-child {
      width: 26%;
      padding-right: 2%;
    }
  }
}
</style>

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
