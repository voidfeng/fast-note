<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { IonBackButton, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonPage, IonToolbar, isPlatform, onIonViewWillLeave } from '@ionic/vue'
import { attachOutline, checkmarkCircleOutline, ellipsisHorizontalCircleOutline, textOutline } from 'ionicons/icons'
import { nanoid } from 'nanoid'
import { computed, nextTick, onMounted, reactive, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import { useWebAuthn } from '@/hooks/useWebAuthn'
import { getTime } from '@/utils/date'

const props = withDefaults(
  defineProps<{
    noteUuid?: string
  }>(),
  {
    noteUuid: '',
  },
)

const route = useRoute()
const router = useRouter()
const { getFirstNote, addNote, getNote, updateNote, deleteNote } = useNote()
const { getFileByUrl } = useFiles()
const { getFileRefsByRefid, updateFileRef } = useFileRefs()
const { isDesktop } = useDeviceType()
const { keyboardHeight, restoreHeight } = useVisualViewport()
const { state: authState, verify, register } = useWebAuthn()

const isIos = isPlatform('ios')
const pageRef = ref()
const editorRef = ref()
const fileInputRef = ref()
const imageInputRef = ref()
const data = ref()
const newNoteId = ref<string | null>(null)

const state = reactive({
  showFormat: false,
  showTableFormat: false,
  showNoteMore: false,
  isAuth: false,
})

const uuidFromRoute = computed(() => route.params.uuid as string)
const uuidFromSource = computed(() => props.noteUuid || uuidFromRoute.value)
const isNewNote = computed(() => uuidFromSource.value === '0')

watch(isNewNote, (isNew) => {
  if (isNew && !newNoteId.value)
    newNoteId.value = nanoid(12)
}, { immediate: true })

const effectiveUuid = computed(() => {
  if (isNewNote.value)
    return newNoteId.value

  return uuidFromSource.value
})

watch(uuidFromSource, (uuid) => {
  if (uuid && uuid !== '0') {
    init(uuid)
  }
  else if (!isNewNote.value) { // This condition means uuid is falsy (e.g. '', undefined)
    // No note selected, clear editor
    data.value = null
    // Using nextTick to ensure editorRef is available
    nextTick(() => {
      if (editorRef.value) {
        editorRef.value.setContent('')
        editorRef.value.setEditable(true)
      }
    })
  }
}, { immediate: true })

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

async function handleNoteSaving() {
  if (!editorRef.value)
    return
  const content = editorRef.value.getContent()
  const { title, smalltext } = editorRef.value.getTitle()

  // 如果是新笔记且内容为空，则不执行任何操作
  if (isNewNote.value && !content)
    return

  // 如果在桌面端首次保存，则生成ID并更新路由
  if (isNewNote.value && isDesktop.value)
    router.replace({ path: `/n/${effectiveUuid.value}` })

  const uuid = effectiveUuid.value
  if (!uuid)
    return

  restoreHeight()

  const time = getTime()

  // 保存笔记数据
  if (content) {
    const noteExists = await getNote(uuid)
    if (noteExists) {
      // 更新笔记
      const updatedNote = Object.assign(toRaw(data.value) || {}, {
        title,
        smalltext,
        newstext: content,
        lastdotime: time,
        version: (data.value?.version || 1) + 1,
      })
      await updateNote(uuid, updatedNote)
    }
    else {
      // 新增笔记
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
  }
  else {
    // 内容为空，删除笔记
    await deleteNote(uuid)
  }

  // 同步附件引用
  await syncAttachments(uuid, content)
}

async function syncAttachments(uuid: string, content: string) {
  const fileUrls = Array.from(content.matchAll(/<file-upload url="([^"]+)"/g), m => m[1])

  const getHash = async (url: string): Promise<string | null> => {
    if (/^[a-f0-9]{64}$/i.test(url))
      return url

    const fileObj = await getFileByUrl(url)
    return fileObj?.hash || null
  }

  const currentHashes = (await Promise.all(fileUrls.map(getHash))).filter(Boolean) as string[]
  const dbFileRefs = await getFileRefsByRefid(uuid)
  const time = getTime()

  const actions: Promise<any>[] = []

  // 识别并处理需要更新或删除的引用
  const dbHashes = new Set(dbFileRefs.map(ref => ref.hash))
  const currentHashesSet = new Set(currentHashes)

  for (const dbFile of dbFileRefs) {
    if (!currentHashesSet.has(dbFile.hash)) {
      // 如果数据库中的引用不在当前内容中，则标记为删除
      if (dbFile.isdeleted !== 1)
        actions.push(updateFileRef({ ...dbFile, isdeleted: 1, lastdotime: time }))
    }
    else {
      // 如果引用存在，则确保其为未删除状态并更新时间
      if (dbFile.isdeleted === 1)
        actions.push(updateFileRef({ ...dbFile, isdeleted: 0, lastdotime: time }))
      else
        actions.push(updateFileRef({ ...dbFile, lastdotime: time }))
    }
  }

  // 识别并添加新的引用 (虽然当前逻辑主要在上传时添加，但这里可以作为保障)
  for (const hash of currentHashes) {
    if (!dbHashes.has(hash)) {
      // 此处逻辑依赖于文件上传时已创建FileRef记录，sync仅负责更新状态
      // 若需在此处创建，则需要更多文件信息
    }
  }

  await Promise.all(actions)
}

async function init(uuid: string) {
  data.value = await getNote(uuid)
  if (data.value) {
    if (data.value.isdeleted === 1)
      editorRef.value?.setEditable(false)

    if (data.value?.islocked === 1) {
      if (authState.isRegistered)
        state.isAuth = await verify()
      else
        state.isAuth = await register()
    }
    nextTick(() => {
      editorRef.value?.setContent(data.value.newstext)
    })
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

function openTableFormatModal() {
  if (keyboardHeight.value > 0 || isPlatform('desktop')) {
    editorRef.value?.setInputMode('none')
    setTimeout(() => {
      state.showTableFormat = true
    }, 300)
  }
}

function openTextFormatModal() {
  if (keyboardHeight.value > 0 || isPlatform('desktop')) {
    editorRef.value?.setInputMode('none')
    setTimeout(() => {
      state.showFormat = true
    }, 300)
  }
}

onMounted(() => {
  // On mobile, when creating a new note from route /n/0, update URL
  if (isNewNote.value && !isDesktop.value)
    window.history.replaceState(null, '', `/n/${newNoteId.value}`)
})

onIonViewWillLeave(() => {
  handleNoteSaving()
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
          <IonButton @click="state.showNoteMore = true">
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

      <div v-if="data?.islocked !== 1 || state.isAuth" class="ion-padding">
        <YYEditor
          v-if="effectiveUuid"
          ref="editorRef"
          :uuid="effectiveUuid"
          @blur="handleNoteSaving"
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
            @touchstart.prevent="openTableFormatModal"
            @click="openTableFormatModal"
          >
            <Icon name="table" class="text-6.5" />
          </IonButton>
          <IonButton
            fill="clear"
            size="large"
            @touchstart.prevent="openTextFormatModal"
            @click="openTextFormatModal"
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
    <NoteMore v-model:is-open="state.showNoteMore" />
    <TableFormatModal v-model:is-open="state.showTableFormat" :editor="((editorRef?.editor || {}) as Editor)" />
    <TextFormatModal v-model:is-open="state.showFormat" :editor="((editorRef?.editor || {}) as Editor)" />
  </IonPage>
</template>

<style lang="scss">
.note-detail__toolbar {
  // --background: #000;
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
